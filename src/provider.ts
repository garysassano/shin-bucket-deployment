import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Duration, Stack, Validations } from "aws-cdk-lib";
import type { ISecurityGroup, IVpc, SubnetSelection } from "aws-cdk-lib/aws-ec2";
import type { IRole } from "aws-cdk-lib/aws-iam";
import { Architecture, Code, Function as LambdaFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import type { ILogGroupRef } from "aws-cdk-lib/aws-logs";
import type { Construct } from "constructs";
import { DEFAULT_FAILURE_DIAGNOSTICS, DEFAULT_PROVIDER_LAMBDA_MEMORY_SIZE_MIB } from "./defaults";
import { FailureDiagnostics, ProviderSharing } from "./enums";
import { ValidationError } from "./errors";
import type { ShinBucketDeploymentLocalBuildOptions } from "./shin-bucket-deployment";
import { normalizeSingletonValue, stableStringify } from "./stable-json";

const HANDLER_BINARY_NAME = "shin-bucket-deployment-handler";
const PACKAGE_NAME = "shin-bucket-deployment";
const SHARED_HANDLER_ID_PREFIX = "ShinBucketDeploymentHandler";
const ISOLATED_HANDLER_ID = "ShinBucketDeploymentHandler";
// Handler identity is recomputed for every construct, so these memoize reads of
// files that cannot change during a synthesis: the installed package manifest and
// the prebuilt bootstrap archives. Both caches live for the whole process rather
// than per-`App`, which is correct for an installed package but means a long-lived
// process that swaps package fixtures under the same path — a test runner, most
// likely — keeps observing the first version and digest it read.
const fileSha256Cache = new Map<string, string>();
let packageVersionCache: string | undefined;

// Lambda's documented invocation ceiling, 900 seconds:
// https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
export const PROVIDER_TIMEOUT = Duration.minutes(15);

interface HandlerOptions {
  readonly architecture: Architecture;
  readonly timeout: Duration;
  readonly memorySize: number;
  readonly role?: IRole;
  readonly vpc?: IVpc;
  readonly vpcSubnets?: SubnetSelection;
  readonly securityGroups?: ISecurityGroup[];
  readonly environment: Record<string, string>;
  readonly logGroup?: ILogGroupRef;
}

/** Provider-only internal configuration used for handler selection and creation. */
export interface ProviderLambdaConfig {
  readonly sharing?: ProviderSharing;
  readonly architecture?: Architecture;
  readonly memorySize?: number;
  readonly failureDiagnostics?: FailureDiagnostics;
  readonly role?: IRole;
  readonly logGroup?: ILogGroupRef;
  readonly vpc?: IVpc;
  readonly vpcSubnets?: SubnetSelection;
  readonly securityGroups?: ISecurityGroup[];
  readonly localBuild?: ShinBucketDeploymentLocalBuildOptions;
}

export function getOrCreateHandler(scope: Construct, config: ProviderLambdaConfig): LambdaFunction {
  const stack = Stack.of(scope);
  const architecture = config.architecture ?? Architecture.ARM_64;

  // A developer opts into local compilation through providerLambda.localBuild;
  // otherwise prefer a prebuilt binary so consumers do not need a Rust
  // toolchain. When neither a prebuilt binary nor an explicit compile request is
  // available (e.g. a local checkout before prebuild), fall back to the local
  // cargo-lambda compile path.
  const wantsCompile = config.localBuild !== undefined;
  const prebuiltBootstrapArchive = wantsCompile
    ? undefined
    : resolvePrebuiltBootstrapArchive(architecture);
  const useCompilePath = wantsCompile || prebuiltBootstrapArchive === undefined;

  const rustProjectPath = useCompilePath
    ? (config.localBuild?.projectPath ?? resolveDefaultRustProjectPath(scope))
    : undefined;
  const manifestPath =
    rustProjectPath !== undefined ? join(rustProjectPath, "Cargo.toml") : undefined;
  const stackScoped = (config.sharing ?? ProviderSharing.STACK) === ProviderSharing.STACK;
  const handlerId = stackScoped
    ? `${SHARED_HANDLER_ID_PREFIX}${renderHandlerConfigHash(
        stack,
        config,
        architecture,
        sharedHandlerSourceIdentity(scope, architecture, manifestPath, prebuiltBootstrapArchive),
      )}`
    : ISOLATED_HANDLER_ID;
  const handlerScope = stackScoped ? stack : scope;

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
    memorySize: config.memorySize ?? DEFAULT_PROVIDER_LAMBDA_MEMORY_SIZE_MIB,
    role: config.role,
    vpc: config.vpc,
    vpcSubnets: config.vpcSubnets,
    securityGroups:
      config.securityGroups && config.securityGroups.length > 0 ? config.securityGroups : undefined,
    environment:
      config.failureDiagnostics === FailureDiagnostics.DETAILED
        ? {
            RUST_BACKTRACE: "1",
            SHIN_DETAILED_FAILURE_DIAGNOSTICS: "true",
          }
        : {},
    logGroup: config.logGroup,
  };

  if (useCompilePath) {
    return createCompiledHandler(
      handlerScope,
      handlerId,
      config.localBuild,
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
      // Hash the manifest content rather than its absolute path so a moved
      // checkout (different machine or directory) keeps handler identity; the
      // prebuilt path already hashes the archive bytes for the same reason.
      // A missing manifest falls back to the path because compilation will
      // fail later anyway with a proper diagnostic.
      manifestSha256: existsSync(manifestPath) ? fileSha256(manifestPath) : manifestPath,
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
  // Bundlers (esbuild/webpack) may rewrite `__dirname` so neither candidate
  // resolves at runtime. Fall back to a stable sentinel instead of failing
  // synthesis: version participates only in handler identity, and a bundled
  // consumer's version cannot change under them at runtime anyway.
  packageVersionCache = `${PACKAGE_NAME}@bundled`;
  Validations.of(scope).addWarning(
    "ShinBucketDeploymentPackageVersionUnresolved",
    `Unable to locate ${PACKAGE_NAME} package metadata. The provider handler identity falls back to a bundled-version sentinel; report this if you did not bundle ${PACKAGE_NAME} yourself.`,
  );
  return packageVersionCache;
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
    "ShinBucketDeploymentLocalProviderBuildProjectPath",
    "Unable to locate rust/Cargo.toml. Pass providerLambda.localBuild.projectPath explicitly.",
    scope,
  );
}

function resolvePrebuiltBootstrapArchive(architecture: Architecture): string | undefined {
  const dirName = `bootstrap-${architecture.name}`;
  // Package-local assets first: the `..` candidate exists for the repository
  // layout (built output under dist/ or lib/ with assets/ at the repo root)
  // but must not shadow the package's own archive when this package is
  // installed inside a larger tree that happens to have an assets/ directory
  // at the parent level.
  const candidates = [
    join(__dirname, "..", "assets", dirName),
    join(__dirname, "..", "..", "assets", dirName),
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
  localBuild: ShinBucketDeploymentLocalBuildOptions | undefined,
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
    bundling: localBuild?.bundling,
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
        "Install it as a devDependency, or omit 'providerLambda.localBuild' to use the " +
        `prebuilt provider binary. Underlying error: ${(error as Error).message}`,
      scope,
    );
  }
}

function renderHandlerConfigHash(
  stack: Stack,
  config: ProviderLambdaConfig,
  architecture: Architecture,
  handlerSource: Record<string, string>,
): string {
  return createHash("sha256")
    .update(renderHandlerConfigHashInput(stack, config, architecture, handlerSource))
    .digest("hex")
    .slice(0, 16);
}

/** Exact canonical serialization hashed for an identically configured stack-scoped handler. */
export function renderHandlerConfigHashInput(
  stack: Stack,
  config: ProviderLambdaConfig,
  architecture: Architecture,
  handlerSource: Record<string, string>,
): string {
  const hashInput = {
    architecture: architecture.name,
    bundling: normalizeSingletonValue(config.localBuild?.bundling),
    failureDiagnostics: config.failureDiagnostics ?? DEFAULT_FAILURE_DIAGNOSTICS,
    handlerSource,
    logGroup: normalizeSingletonValue(config.logGroup),
    // Keep this stable semantic key even though the public property is now
    // providerLambda.memorySize. Public nesting must not split handler identity.
    memoryLimit: normalizeSingletonValue(
      config.memorySize ?? DEFAULT_PROVIDER_LAMBDA_MEMORY_SIZE_MIB,
    ),
    role: normalizeSingletonValue(config.role),
    securityGroups:
      config.securityGroups && config.securityGroups.length > 0
        ? config.securityGroups.map((securityGroup) => securityGroup.node.addr).sort()
        : undefined,
    stack: stack.node.addr,
    vpc: normalizeSingletonValue(config.vpc),
    vpcSubnets: normalizeSingletonValue(config.vpcSubnets),
  };
  return stableStringify(hashInput);
}
