import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

type PackageJson = { readonly name?: string; readonly version?: string };

export type BenchmarkSourceMetadata = {
  readonly commit: string;
  readonly subject: string;
  readonly gitDirty: boolean;
  readonly providerPackageName: string;
  readonly providerPackageVersion: string;
  readonly cdkCliVersion: string;
  readonly awsCdkLibVersion: string;
  readonly awsCdkLibIntegrity: string;
  readonly providerBootstrapSha256: string;
  readonly changedPaths: readonly string[];
};

export async function collectBenchmarkSourceMetadata(
  repositoryRoot = process.cwd(),
): Promise<BenchmarkSourceMetadata> {
  const packageJson = readJson<PackageJson>(join(repositoryRoot, "package.json"));
  const cdkPackage = readJson<PackageJson>(
    join(repositoryRoot, "node_modules", "aws-cdk", "package.json"),
  );
  const cdkLibPackage = readJson<PackageJson>(
    join(repositoryRoot, "node_modules", "aws-cdk-lib", "package.json"),
  );
  const lockfile = readFileSync(join(repositoryRoot, "pnpm-lock.yaml"), "utf8");
  const bootstrapArchive = join(repositoryRoot, "assets", "bootstrap-arm64", "bootstrap.zip");
  if (!existsSync(bootstrapArchive)) {
    throw new Error(`Missing benchmark provider bootstrap: ${bootstrapArchive}`);
  }
  const [commit, subject, status, bootstrap] = await Promise.all([
    commandText("git", ["rev-parse", "HEAD"], repositoryRoot),
    commandText("git", ["log", "-1", "--format=%s"], repositoryRoot),
    commandText("git", ["status", "--porcelain", "--untracked-files=normal"], repositoryRoot),
    commandBytes("unzip", ["-p", bootstrapArchive, "bootstrap"], repositoryRoot),
  ]);
  return {
    commit,
    subject,
    gitDirty: sourceStatusLines(status, repositoryRoot).length > 0,
    changedPaths: sourceStatusLines(status, repositoryRoot),
    providerPackageName: requiredPackageField(packageJson.name, "package name"),
    providerPackageVersion: requiredPackageField(packageJson.version, "package version"),
    cdkCliVersion: requiredPackageField(cdkPackage.version, "aws-cdk version"),
    awsCdkLibVersion: requiredPackageField(cdkLibPackage.version, "aws-cdk-lib version"),
    awsCdkLibIntegrity: packageIntegrity(lockfile, "aws-cdk-lib", cdkLibPackage.version),
    providerBootstrapSha256: createHash("sha256").update(bootstrap).digest("hex"),
  };
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
