import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
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
const PACKAGE_NAME = "shin-bucket-deployment";
const SHARED_HANDLER_ID_PREFIX = "ShinBucketDeploymentHandler";
const ISOLATED_HANDLER_ID = "ShinBucketDeploymentHandler";
const DEFAULT_MEMORY_LIMIT_MB = 1024;
const fileSha256Cache = new Map<string, string>();
let packageVersionCache: string | undefined;

export const PROVIDER_TIMEOUT = Duration.minutes(15);

interface HandlerOptions {
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
  const shareHandler = props.shareHandler ?? true;
  const handlerId = shareHandler
    ? `${SHARED_HANDLER_ID_PREFIX}${renderHandlerConfigHash(
        stack,
        props,
        architecture,
        sharedHandlerSourceIdentity(scope, architecture, manifestPath, prebuiltBootstrapArchive),
      )}`
    : ISOLATED_HANDLER_ID;
  const handlerScope = shareHandler ? stack : scope;

  const existing = handlerScope.node.tryFindChild(handlerId);
  if (existing) {
    if (!(existing instanceof LambdaFunction)) {
      throw new ValidationError(
        "ShinBucketDeploymentHandlerCollision",
        `Found non-Function child for provider handler id ${handlerId}.`,
        scope,
      );
    }
    return existing;
  }

  const handlerOptions: HandlerOptions = {
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
    return createCompiledHandler(
      handlerScope,
      handlerId,
      props,
      handlerOptions,
      manifestPath as string,
    );
  }
  return createPrebuiltHandler(
    handlerScope,
    handlerId,
    handlerOptions,
    prebuiltBootstrapArchive as string,
  );
}

function sharedHandlerSourceIdentity(
  scope: Construct,
  architecture: Architecture,
  manifestPath: string | undefined,
  prebuiltBootstrapArchive: string | undefined,
): Record<string, string> {
  const packageVersion = resolvePackageVersion(scope);
  if (prebuiltBootstrapArchive !== undefined) {
    return {
      kind: "prebuilt",
      packageVersion,
      architecture: architecture.name,
      bootstrapArchiveSha256: fileSha256(prebuiltBootstrapArchive),
    };
  }
  if (manifestPath !== undefined) {
    return {
      kind: "compile",
      packageVersion,
      manifestPath,
    };
  }
  throw new ValidationError(
    "ShinBucketDeploymentHandlerSource",
    "Unable to resolve a prebuilt provider archive or local Rust manifest.",
    scope,
  );
}

function resolvePackageVersion(scope: Construct): string {
  if (packageVersionCache !== undefined) return packageVersionCache;
  const candidates = [
    join(__dirname, "..", "package.json"),
    join(__dirname, "..", "..", "package.json"),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    let manifest: unknown;
    try {
      manifest = JSON.parse(readFileSync(candidate, "utf8"));
    } catch (error) {
      throw new ValidationError(
        "ShinBucketDeploymentPackageManifest",
        `Unable to parse ${PACKAGE_NAME} package metadata: ${(error as Error).message}`,
        scope,
      );
    }
    if (
      typeof manifest === "object" &&
      manifest !== null &&
      (manifest as { name?: unknown }).name === PACKAGE_NAME &&
      typeof (manifest as { version?: unknown }).version === "string" &&
      (manifest as { version: string }).version.length > 0
    ) {
      packageVersionCache = (manifest as { version: string }).version;
      return packageVersionCache;
    }
  }
  throw new ValidationError(
    "ShinBucketDeploymentPackageManifest",
    `Unable to locate ${PACKAGE_NAME} package metadata with a non-empty version.`,
    scope,
  );
}

function fileSha256(path: string): string {
  const cached = fileSha256Cache.get(path);
  if (cached !== undefined) return cached;
  const digest = createHash("sha256").update(readFileSync(path)).digest("hex");
  fileSha256Cache.set(path, digest);
  return digest;
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
  scope: Construct,
  handlerId: string,
  options: HandlerOptions,
  bootstrapArchive: string,
): LambdaFunction {
  return new LambdaFunction(scope, handlerId, {
    runtime: Runtime.PROVIDED_AL2023,
    handler: "bootstrap",
    code: Code.fromAsset(bootstrapArchive),
    architecture: options.architecture,
    timeout: options.timeout,
    memorySize: options.memorySize,
    role: options.role,
    vpc: options.vpc,
    vpcSubnets: options.vpcSubnets,
    securityGroups: options.securityGroups,
    environment: options.environment,
    logGroup: options.logGroup,
  });
}

function createCompiledHandler(
  scope: Construct,
  handlerId: string,
  props: ShinBucketDeploymentProps,
  options: HandlerOptions,
  manifestPath: string,
): LambdaFunction {
  // Lazily load cargo-lambda-cdk so it is only required when a developer opts
  // into the local compile path. It is an optional peer dependency and is not
  // installed for typical consumers using the prebuilt binary.
  const { RustFunction } = loadCargoLambdaCdk(scope);
  return new RustFunction(scope, handlerId, {
    runtime: "provided.al2023",
    architecture: options.architecture,
    binaryName: HANDLER_BINARY_NAME,
    manifestPath,
    bundling: props.bundling,
    timeout: options.timeout,
    memorySize: options.memorySize,
    role: options.role,
    vpc: options.vpc,
    vpcSubnets: options.vpcSubnets,
    securityGroups: options.securityGroups,
    environment: options.environment,
    logGroup: options.logGroup,
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
  handlerSource: Record<string, string>,
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
