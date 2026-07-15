import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Duration, Stack } from "aws-cdk-lib";
import {
  type Architecture,
  Code,
  Function as LambdaFunction,
  Runtime,
} from "aws-cdk-lib/aws-lambda";
import type { Construct } from "constructs";
import { ValidationError } from "./errors";
import type { ShinBucketDeploymentProps } from "./shin-bucket-deployment";
import { normalizeSingletonValue, stableStringify } from "./stable-json";

const HANDLER_BINARY_NAME = "shin-bucket-deployment-handler";
const SHARED_HANDLER_ID_PREFIX = "ShinBucketDeploymentHandler";
const DEFAULT_MEMORY_LIMIT_MB = 1024;

export const PROVIDER_TIMEOUT = Duration.minutes(15);

interface SharedHandlerOptions {
  readonly architecture: Architecture;
  readonly timeout: Duration;
  readonly memorySize: number;
  readonly role: ShinBucketDeploymentProps["role"];
  readonly vpc: ShinBucketDeploymentProps["vpc"];
  readonly vpcSubnets: ShinBucketDeploymentProps["vpcSubnets"];
  readonly securityGroups: ShinBucketDeploymentProps["securityGroups"];
  readonly environment: Record<string, string>;
  readonly logGroup: ShinBucketDeploymentProps["logGroup"];
}

export function getOrCreateHandler(
  scope: Construct,
  props: ShinBucketDeploymentProps,
  architecture: Architecture,
): LambdaFunction {
  const stack = Stack.of(scope);

  // A developer is iterating on the handler when they point at a Rust project or
  // pass bundling options; otherwise prefer a prebuilt binary so consumers do not
  // need a Rust toolchain. When neither a prebuilt binary nor an explicit compile
  // request is available (e.g. a local checkout before prebuild), fall back to the
  // local cargo-lambda compile path.
  const wantsCompile = props.rustProjectPath !== undefined || props.bundling !== undefined;
  const prebuiltBootstrapArchive = wantsCompile
    ? undefined
    : resolvePrebuiltBootstrapArchive(architecture);
  const useCompilePath = wantsCompile || prebuiltBootstrapArchive === undefined;

  const rustProjectPath = useCompilePath
    ? (props.rustProjectPath ?? resolveDefaultRustProjectPath(scope))
    : undefined;
  const manifestPath =
    rustProjectPath !== undefined ? join(rustProjectPath, "Cargo.toml") : undefined;
  const handlerSource = useCompilePath
    ? `compile:${manifestPath}`
    : `prebuilt:${architecture.name}`;
  const handlerId = `${SHARED_HANDLER_ID_PREFIX}${renderHandlerConfigHash(
    stack,
    props,
    architecture,
    handlerSource,
  )}`;

  const existing = stack.node.tryFindChild(handlerId);
  if (existing) {
    if (!(existing instanceof LambdaFunction)) {
      throw new ValidationError(
        "ShinBucketDeploymentHandlerCollision",
        `Found non-Function child for shared handler id ${handlerId}.`,
        scope,
      );
    }
    return existing;
  }

  const shared: SharedHandlerOptions = {
    architecture,
    timeout: PROVIDER_TIMEOUT,
    memorySize: props.memoryLimit ?? DEFAULT_MEMORY_LIMIT_MB,
    role: props.role,
    vpc: props.vpc,
    vpcSubnets: props.vpcSubnets,
    securityGroups:
      props.securityGroups && props.securityGroups.length > 0 ? props.securityGroups : undefined,
    environment: {
      RUST_BACKTRACE: "1",
    },
    logGroup: props.logGroup,
  };

  if (useCompilePath) {
    return createCompiledHandler(stack, handlerId, props, shared, manifestPath as string);
  }
  return createPrebuiltHandler(stack, handlerId, shared, prebuiltBootstrapArchive as string);
}

function resolveDefaultRustProjectPath(scope: Construct): string {
  const candidates = [join(__dirname, "..", "rust"), join(__dirname, "..", "..", "rust")];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, "Cargo.toml"))) {
      return candidate;
    }
  }
  throw new ValidationError(
    "ShinBucketDeploymentRustProjectPath",
    "Unable to locate rust/Cargo.toml. Pass rustProjectPath explicitly.",
    scope,
  );
}

function resolvePrebuiltBootstrapArchive(architecture: Architecture): string | undefined {
  const dirName = `bootstrap-${architecture.name}`;
  const candidates = [
    join(__dirname, "..", "..", "assets", dirName),
    join(__dirname, "..", "assets", dirName),
  ];
  for (const candidate of candidates) {
    const archive = join(candidate, "bootstrap.zip");
    if (existsSync(archive)) {
      return archive;
    }
  }
  return undefined;
}

function createPrebuiltHandler(
  stack: Stack,
  handlerId: string,
  shared: SharedHandlerOptions,
  bootstrapArchive: string,
): LambdaFunction {
  return new LambdaFunction(stack, handlerId, {
    runtime: Runtime.PROVIDED_AL2023,
    handler: "bootstrap",
    code: Code.fromAsset(bootstrapArchive),
    architecture: shared.architecture,
    timeout: shared.timeout,
    memorySize: shared.memorySize,
    role: shared.role,
    vpc: shared.vpc,
    vpcSubnets: shared.vpcSubnets,
    securityGroups: shared.securityGroups,
    environment: shared.environment,
    logGroup: shared.logGroup,
  });
}

function createCompiledHandler(
  stack: Stack,
  handlerId: string,
  props: ShinBucketDeploymentProps,
  shared: SharedHandlerOptions,
  manifestPath: string,
): LambdaFunction {
  // Lazily load cargo-lambda-cdk so it is only required when a developer opts
  // into the local compile path. It is an optional peer dependency and is not
  // installed for typical consumers using the prebuilt binary.
  const { RustFunction } = loadCargoLambdaCdk(stack);
  return new RustFunction(stack, handlerId, {
    runtime: "provided.al2023",
    architecture: shared.architecture,
    binaryName: HANDLER_BINARY_NAME,
    manifestPath,
    bundling: props.bundling,
    timeout: shared.timeout,
    memorySize: shared.memorySize,
    role: shared.role,
    vpc: shared.vpc,
    vpcSubnets: shared.vpcSubnets,
    securityGroups: shared.securityGroups,
    environment: shared.environment,
    logGroup: shared.logGroup,
  });
}

function loadCargoLambdaCdk(scope: Construct): typeof import("cargo-lambda-cdk") {
  try {
    return require("cargo-lambda-cdk") as typeof import("cargo-lambda-cdk");
  } catch (error) {
    throw new ValidationError(
      "ShinBucketDeploymentCargoLambdaMissing",
      "The local Rust compile path requires the optional 'cargo-lambda-cdk' dependency. " +
        "Install it as a devDependency, or omit 'bundling'/'rustProjectPath' to use the " +
        `prebuilt provider binary. Underlying error: ${(error as Error).message}`,
      scope,
    );
  }
}

function renderHandlerConfigHash(
  stack: Stack,
  props: ShinBucketDeploymentProps,
  architecture: Architecture,
  handlerSource: string,
): string {
  const config = {
    architecture: architecture.name,
    bundling: normalizeSingletonValue(props.bundling),
    handlerSource,
    logGroup: normalizeSingletonValue(props.logGroup),
    memoryLimit: normalizeSingletonValue(props.memoryLimit ?? DEFAULT_MEMORY_LIMIT_MB),
    role: normalizeSingletonValue(props.role),
    securityGroups:
      props.securityGroups && props.securityGroups.length > 0
        ? [...props.securityGroups]
            .map((securityGroup) => normalizeSingletonValue(securityGroup))
            .sort()
        : undefined,
    stack: stack.node.addr,
    vpc: normalizeSingletonValue(props.vpc),
    vpcSubnets: normalizeSingletonValue(props.vpcSubnets),
  };
  return createHash("sha256").update(stableStringify(config)).digest("hex").slice(0, 16);
}
