import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  statSync,
} from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

type PackageJson = { readonly name?: string; readonly version?: string };

type BootstrapBuildProvenance = {
  readonly schemaVersion?: number;
  readonly architecture?: string;
  readonly binaryName?: string;
  readonly target?: string;
  readonly sourceCommit?: string;
  readonly sourceDirty?: boolean;
  readonly sourceTreeSha256?: string;
  readonly applicationBuildSha256?: string;
  readonly cargoVersion?: string;
  readonly rustcVersion?: string;
  readonly cargoLambdaVersion?: string;
  readonly zigVersion?: string;
  readonly buildToolchainSha256?: string;
  readonly buildEnvironmentSha256?: string;
  readonly bootstrapSha256?: string;
  readonly bootstrapArchiveSha256?: string;
};

export type BenchmarkSourceMetadata = {
  readonly commit: string;
  readonly subject: string;
  readonly gitDirty: boolean;
  readonly sourceTreeSha256: string;
  readonly providerPackageName: string;
  readonly providerPackageVersion: string;
  readonly cdkCliVersion: string;
  readonly cdkCliInstalledSha256: string;
  readonly awsCdkLibVersion: string;
  readonly awsCdkLibIntegrity: string;
  readonly awsCdkLibInstalledSha256: string;
  readonly constructsInstalledSha256: string;
  readonly dependencyLockSha256: string;
  readonly applicationBuildSha256: string;
  readonly installedDependenciesSha256: string;
  readonly nodeVersion: string;
  readonly pnpmVersion: string;
  readonly executionEnvironmentSha256: string;
  readonly providerBootstrapSha256: string;
  readonly providerBootstrapArchiveSha256: string;
  readonly providerBootstrapProvenanceSha256: string;
  readonly providerBootstrapBuildDirty: boolean;
  readonly providerBootstrapCargoVersion: string;
  readonly providerBootstrapRustcVersion: string;
  readonly providerBootstrapCargoLambdaVersion: string;
  readonly providerBootstrapZigVersion: string;
  readonly providerBootstrapBuildToolchainSha256: string;
  readonly providerBootstrapBuildEnvironmentSha256: string;
  readonly credentialAccountSha256: string;
  readonly credentialIdentitySha256: string;
  readonly changedPaths: readonly string[];
};

export async function collectBenchmarkSourceMetadata(
  repositoryRoot = process.cwd(),
  evidenceOutputFile: string | undefined = undefined,
): Promise<BenchmarkSourceMetadata> {
  const packageJson = readJson<PackageJson>(join(repositoryRoot, "package.json"));
  const cdkPackage = readJson<PackageJson>(
    join(repositoryRoot, "node_modules", "aws-cdk", "package.json"),
  );
  const cdkPackageRoot = join(repositoryRoot, "node_modules", "aws-cdk");
  const cdkLibPackage = readJson<PackageJson>(
    join(repositoryRoot, "node_modules", "aws-cdk-lib", "package.json"),
  );
  const cdkLibPackageRoot = join(repositoryRoot, "node_modules", "aws-cdk-lib");
  const constructsPackageRoot = join(repositoryRoot, "node_modules", "constructs");
  const zodPackageRoot = join(repositoryRoot, "node_modules", "zod");
  const cargoLambdaCdkPackageRoot = join(repositoryRoot, "node_modules", "cargo-lambda-cdk");
  const evidenceRelative = evidenceOutputFile
    ? repositoryRelativePath(repositoryRoot, evidenceOutputFile)
    : undefined;
  const lockfile = readFileSync(join(repositoryRoot, "pnpm-lock.yaml"), "utf8");
  const bootstrapArchive = join(repositoryRoot, "assets", "bootstrap-arm64", "bootstrap.zip");
  const bootstrapProvenance = join(
    repositoryRoot,
    "assets",
    "bootstrap-arm64",
    "build-provenance.json",
  );
  if (!existsSync(bootstrapArchive) || !existsSync(bootstrapProvenance)) {
    throw new Error(
      "Missing benchmark provider bootstrap or build provenance; run node scripts/build-bootstrap.mjs --benchmark arm64.",
    );
  }
  const [commit, subject, status, bootstrap, identityText, pnpmVersion, sourceIdentityText] =
    await Promise.all([
      commandText("git", ["rev-parse", "HEAD"], repositoryRoot),
      commandText("git", ["log", "-1", "--format=%s"], repositoryRoot),
      commandText("git", ["status", "--porcelain", "--untracked-files=all"], repositoryRoot),
      commandBytes("unzip", ["-p", bootstrapArchive, "bootstrap"], repositoryRoot),
      commandText("aws", ["sts", "get-caller-identity", "--output", "json"], repositoryRoot),
      commandText("pnpm", ["--version"], repositoryRoot),
      commandText(
        "node",
        [
          join(repositoryRoot, "scripts", "source-identity.mjs"),
          repositoryRoot,
          ...(evidenceRelative === undefined ? [] : [evidenceRelative]),
        ],
        repositoryRoot,
      ),
    ]);
  const identity = JSON.parse(identityText) as { Account?: string; Arn?: string };
  if (!identity.Account || !identity.Arn) throw new Error("AWS caller identity is incomplete.");
  const selectedProfile =
    process.env.AWS_PROFILE ?? process.env.AWS_DEFAULT_PROFILE ?? "default-chain";
  const changedPaths = sourceStatusLines(status, repositoryRoot);
  const archive = readFileSync(bootstrapArchive);
  const provenanceText = readFileSync(bootstrapProvenance, "utf8");
  const provenance = JSON.parse(provenanceText) as BootstrapBuildProvenance;
  const sourceIdentity = JSON.parse(sourceIdentityText) as {
    commit?: string;
    dirty?: boolean;
    sourceTreeSha256?: string;
    cargoVersion?: string;
    rustcVersion?: string;
    cargoLambdaVersion?: string;
    zigVersion?: string;
    buildToolchainSha256?: string;
    buildEnvironmentSha256?: string;
  };
  if (sourceIdentity.commit !== commit || typeof sourceIdentity.dirty !== "boolean") {
    throw new Error("Benchmark source identity changed while metadata was collected.");
  }
  const bootstrapSha256 = createHash("sha256").update(bootstrap).digest("hex");
  const bootstrapArchiveSha256 = createHash("sha256").update(archive).digest("hex");
  const applicationBuildSha256 = directoryDigest(join(repositoryRoot, "dist"));
  const cargoVersion = requiredString(sourceIdentity.cargoVersion, "Cargo version");
  const rustcVersion = requiredString(sourceIdentity.rustcVersion, "Rust version");
  const cargoLambdaVersion = requiredString(
    sourceIdentity.cargoLambdaVersion,
    "cargo-lambda version",
  );
  const zigVersion = requiredString(sourceIdentity.zigVersion, "Zig version");
  assertBootstrapBuildProvenance({
    provenance,
    commit,
    cargoVersion,
    rustcVersion,
    cargoLambdaVersion,
    zigVersion,
    buildToolchainSha256: sourceIdentity.buildToolchainSha256,
    buildEnvironmentSha256: sourceIdentity.buildEnvironmentSha256,
    sourceTreeSha256: sourceIdentity.sourceTreeSha256,
    applicationBuildSha256,
    sourceDirty: sourceIdentity.dirty,
    bootstrapSha256,
    bootstrapArchiveSha256,
  });
  return {
    commit,
    subject,
    gitDirty: changedPaths.length > 0,
    sourceTreeSha256: requiredSha256(sourceIdentity.sourceTreeSha256, "source tree identity"),
    changedPaths,
    providerPackageName: requiredPackageField(packageJson.name, "package name"),
    providerPackageVersion: requiredPackageField(packageJson.version, "package version"),
    cdkCliVersion: requiredPackageField(cdkPackage.version, "aws-cdk version"),
    cdkCliInstalledSha256: directoryDigest(cdkPackageRoot),
    awsCdkLibVersion: requiredPackageField(cdkLibPackage.version, "aws-cdk-lib version"),
    awsCdkLibIntegrity: packageIntegrity(lockfile, "aws-cdk-lib", cdkLibPackage.version),
    awsCdkLibInstalledSha256: directoryDigest(cdkLibPackageRoot),
    constructsInstalledSha256: directoryDigest(constructsPackageRoot),
    dependencyLockSha256: createHash("sha256").update(lockfile).digest("hex"),
    applicationBuildSha256,
    installedDependenciesSha256: directorySetDigest({
      "aws-cdk": cdkPackageRoot,
      "aws-cdk-lib": cdkLibPackageRoot,
      constructs: constructsPackageRoot,
      "cargo-lambda-cdk": cargoLambdaCdkPackageRoot,
      zod: zodPackageRoot,
    }),
    nodeVersion: process.version,
    pnpmVersion,
    executionEnvironmentSha256: executionEnvironmentSha256(),
    providerBootstrapSha256: bootstrapSha256,
    providerBootstrapArchiveSha256: bootstrapArchiveSha256,
    providerBootstrapProvenanceSha256: createHash("sha256").update(provenanceText).digest("hex"),
    providerBootstrapBuildDirty: provenance.sourceDirty as boolean,
    providerBootstrapCargoVersion: cargoVersion,
    providerBootstrapRustcVersion: rustcVersion,
    providerBootstrapCargoLambdaVersion: cargoLambdaVersion,
    providerBootstrapZigVersion: zigVersion,
    providerBootstrapBuildToolchainSha256: requiredSha256(
      provenance.buildToolchainSha256,
      "provider bootstrap build toolchain identity",
    ),
    providerBootstrapBuildEnvironmentSha256: requiredSha256(
      provenance.buildEnvironmentSha256,
      "provider bootstrap build environment identity",
    ),
    credentialAccountSha256: createHash("sha256").update(identity.Account).digest("hex"),
    credentialIdentitySha256: createHash("sha256")
      .update(`${identity.Account}\0${stableCredentialArn(identity.Arn)}\0${selectedProfile}`)
      .digest("hex"),
  };
}

export function assertBootstrapBuildProvenance(args: {
  readonly provenance: BootstrapBuildProvenance;
  readonly commit: string;
  readonly cargoVersion: string;
  readonly rustcVersion: string;
  readonly cargoLambdaVersion: string;
  readonly zigVersion: string;
  readonly buildToolchainSha256: string | undefined;
  readonly buildEnvironmentSha256: string | undefined;
  readonly sourceTreeSha256: string | undefined;
  readonly applicationBuildSha256: string;
  readonly sourceDirty: boolean | undefined;
  readonly bootstrapSha256: string;
  readonly bootstrapArchiveSha256: string;
}): void {
  const { provenance } = args;
  if (
    provenance.schemaVersion !== 1 ||
    provenance.architecture !== "arm64" ||
    provenance.binaryName !== "shin-bucket-deployment-handler" ||
    provenance.target !== "aarch64-unknown-linux-gnu" ||
    provenance.sourceCommit !== args.commit ||
    provenance.sourceDirty !== args.sourceDirty ||
    provenance.sourceTreeSha256 !== args.sourceTreeSha256 ||
    provenance.applicationBuildSha256 !== args.applicationBuildSha256 ||
    provenance.cargoVersion !== args.cargoVersion ||
    provenance.rustcVersion !== args.rustcVersion ||
    provenance.cargoLambdaVersion !== args.cargoLambdaVersion ||
    provenance.zigVersion !== args.zigVersion ||
    provenance.buildToolchainSha256 !== args.buildToolchainSha256 ||
    provenance.buildEnvironmentSha256 !== args.buildEnvironmentSha256 ||
    provenance.bootstrapSha256 !== args.bootstrapSha256 ||
    provenance.bootstrapArchiveSha256 !== args.bootstrapArchiveSha256
  ) {
    throw new Error(
      "Benchmark provider bootstrap provenance does not match the current source, application build, toolchain, or archive; rebuild it with node scripts/build-bootstrap.mjs --benchmark arm64.",
    );
  }
}

function requiredSha256(value: string | undefined, label: string): string {
  if (!value || !/^[0-9a-f]{64}$/i.test(value)) throw new Error(`Missing or invalid ${label}.`);
  return value;
}

function stableCredentialArn(arn: string): string {
  return arn.replace(/:sts::(\d{12}):assumed-role\/(.+)\/[^/]+$/, ":iam::$1:role/$2");
}

export function sourceStatusLines(
  porcelainStatus: string,
  repositoryRoot: string,
  evidenceOutputFile: string | undefined = undefined,
): string[] {
  const ignoredPath = evidenceOutputFile
    ? normalizePath(
        isAbsolute(evidenceOutputFile)
          ? relative(repositoryRoot, evidenceOutputFile)
          : relative(repositoryRoot, resolve(repositoryRoot, evidenceOutputFile)),
      )
    : undefined;
  return porcelainStatus
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => {
      const changedPath = changedPathFromStatusLine(line);
      return ignoredPath === undefined || changedPath !== ignoredPath;
    });
}

export function assertBenchmarkSourceMetadataUnchanged(args: {
  readonly expected: BenchmarkSourceMetadata;
  readonly current: BenchmarkSourceMetadata;
  readonly repositoryRoot: string;
  readonly evidenceOutputFile: string;
  readonly requireClean?: boolean;
}): void {
  const evidenceRelative = normalizePath(
    isAbsolute(args.evidenceOutputFile)
      ? relative(args.repositoryRoot, args.evidenceOutputFile)
      : relative(args.repositoryRoot, resolve(args.repositoryRoot, args.evidenceOutputFile)),
  );
  const expectedSourceChanges = args.expected.changedPaths.filter(
    (line) => changedPathFromStatusLine(line) !== evidenceRelative,
  );
  const currentSourceChanges = args.current.changedPaths.filter(
    (line) => changedPathFromStatusLine(line) !== evidenceRelative,
  );
  const expectedDirty = args.expected.changedPaths.length > 0;
  const currentDirty = args.current.changedPaths.length > 0;
  if (args.expected.gitDirty !== expectedDirty || args.current.gitDirty !== currentDirty) {
    throw new Error("Benchmark source dirty-state metadata is inconsistent.");
  }
  if (args.requireClean !== false && currentSourceChanges.length > 0) {
    throw new Error("Benchmark source became dirty during the evidence run.");
  }
  if (
    args.requireClean === false &&
    JSON.stringify(currentSourceChanges) !== JSON.stringify(expectedSourceChanges)
  ) {
    throw new Error("Benchmark source changes drifted during the evidence run.");
  }
  const {
    gitDirty: _expectedDirty,
    changedPaths: _expectedPaths,
    ...expectedIdentity
  } = args.expected;
  const { gitDirty: _currentDirty, changedPaths: _currentPaths, ...currentIdentity } = args.current;
  if (JSON.stringify(currentIdentity) !== JSON.stringify(expectedIdentity)) {
    throw new Error("Benchmark source, dependencies, bootstrap, or credential account changed.");
  }
}

export function changedPathFromStatusLine(line: string): string {
  return normalizePath(line.slice(3).replace(/^"|"$/g, ""));
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function requiredPackageField(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`Missing ${label}.`);
  }
  return value;
}

function requiredString(value: string | undefined, label: string): string {
  if (!value) throw new Error(`Missing ${label}.`);
  return value;
}

function executionEnvironmentSha256(): string {
  const names = [
    "CDK_CONTEXT_JSON",
    "CDK_DEFAULT_ACCOUNT",
    "CDK_DEFAULT_REGION",
    "AWS_CA_BUNDLE",
    "AWS_CONFIG_FILE",
    "AWS_ENDPOINT_URL",
    "AWS_MAX_ATTEMPTS",
    "AWS_RETRY_MODE",
    "AWS_SHARED_CREDENTIALS_FILE",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "NO_PROXY",
    "NODE_OPTIONS",
    "NODE_PATH",
    "PNPM_HOME",
  ];
  return createHash("sha256")
    .update(
      JSON.stringify(Object.fromEntries(names.map((name) => [name, process.env[name] ?? null]))),
    )
    .digest("hex");
}

export function packageIntegrity(
  lockfile: string,
  name: string,
  version: string | undefined,
): string {
  if (!version) {
    throw new Error(`Missing ${name} version.`);
  }
  const escapedName = escapeRegExp(name);
  const escapedVersion = escapeRegExp(version);
  const match = lockfile.match(
    new RegExp(
      `^  ${escapedName}@${escapedVersion}:\\n    resolution: \\{integrity: ([^}]+)\\}`,
      "m",
    ),
  );
  const integrity = match?.[1];
  if (!integrity) {
    throw new Error(`Missing ${name}@${version} integrity in pnpm-lock.yaml.`);
  }
  return integrity;
}

async function commandText(command: string, args: readonly string[], cwd: string): Promise<string> {
  return (await commandBytes(command, args, cwd)).toString("utf8").trim();
}

async function commandBytes(
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const child = spawn(command, [...args], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (status) => {
      if (status !== 0) {
        reject(
          new Error(
            `${command} ${args.join(" ")} failed: ${Buffer.concat(stderr).toString("utf8").trim()}`,
          ),
        );
        return;
      }
      resolve(Buffer.concat(stdout));
    });
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/");
}

function repositoryRelativePath(root: string, path: string): string | undefined {
  const relativePath = normalizePath(relative(root, resolve(root, path)));
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith("../") ||
    isAbsolute(relativePath)
  ) {
    return undefined;
  }
  return relativePath;
}

function directoryDigest(root: string): string {
  const hash = createHash("sha256");
  const visit = (
    directory: string,
    relativeDirectory: string,
    ancestors: ReadonlySet<string>,
  ): void => {
    const realDirectory = realpathSync(directory);
    if (ancestors.has(realDirectory)) {
      hash.update(`cycle\0${relativeDirectory}\0`);
      return;
    }
    const nextAncestors = new Set(ancestors).add(realDirectory);
    for (const entry of readdirSync(directory, { withFileTypes: true }).toSorted((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const path = join(directory, entry.name);
      const relativePath = normalizePath(join(relativeDirectory, entry.name));
      if (entry.isDirectory()) {
        hash.update(`directory\0${relativePath}\0`);
        visit(path, relativePath, nextAncestors);
      } else if (entry.isFile()) {
        hash.update(`file\0${relativePath}\0${lstatSync(path).mode & 0o111}\0`);
        hash.update(readFileSync(path));
        hash.update("\0");
      } else if (entry.isSymbolicLink()) {
        hash.update(`symlink\0${relativePath}\0${readlinkSync(path)}\0`);
        const target = statSync(path);
        if (target.isDirectory()) {
          visit(path, relativePath, nextAncestors);
        } else if (target.isFile()) {
          hash.update(`linked-file\0${relativePath}\0${target.mode & 0o111}\0`);
          hash.update(readFileSync(path));
          hash.update("\0");
        } else {
          throw new Error(`Unsupported installed package symlink target: ${path}`);
        }
      } else {
        throw new Error(`Unsupported installed package entry: ${path}`);
      }
    }
  };
  visit(root, "", new Set());
  return hash.digest("hex");
}

function directorySetDigest(roots: Readonly<Record<string, string>>): string {
  const hash = createHash("sha256");
  for (const [name, root] of Object.entries(roots).toSorted(([left], [right]) =>
    left.localeCompare(right),
  )) {
    hash.update(`${name}\0${directoryDigest(root)}\0`);
  }
  return hash.digest("hex");
}
