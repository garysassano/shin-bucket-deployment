import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, readlinkSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const BUILD_ENVIRONMENT_NAMES = [
  "AR",
  "CC",
  "CFLAGS",
  "CXX",
  "CXXFLAGS",
  "CARGO_BUILD_RUSTC_WRAPPER",
  "CARGO_ENCODED_RUSTFLAGS",
  "CARGO_HOME",
  "CARGO_PROFILE_RELEASE_CODEGEN_UNITS",
  "CARGO_PROFILE_RELEASE_LTO",
  "CARGO_PROFILE_RELEASE_OPT_LEVEL",
  "CARGO_PROFILE_RELEASE_PANIC",
  "RUSTC_WRAPPER",
  "RUSTC_WORKSPACE_WRAPPER",
  "RUSTFLAGS",
  "RUSTUP_HOME",
  "SOURCE_DATE_EPOCH",
  "ZIG_GLOBAL_CACHE_DIR",
  "ZIG_LOCAL_CACHE_DIR",
];
const EXECUTION_ENVIRONMENT_NAMES = [
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

export function collectSourceIdentity(repositoryRoot, excludedPaths = []) {
  const root = resolve(repositoryRoot);
  const commit = command("git", ["rev-parse", "HEAD"], root).toString("utf8").trim();
  const pathspecs = [
    ".",
    ...excludedPaths
      .map((path) => repositoryRelativePath(root, path))
      .filter((path) => path !== undefined)
      .map((path) => `:(top,exclude,literal)${path}`),
  ];
  const diff = command(
    "git",
    ["diff", "--binary", "--no-ext-diff", "HEAD", "--", ...pathspecs],
    root,
  );
  const tracked = parseTrackedEntries(
    command("git", ["ls-files", "--stage", "-z", "--", ...pathspecs], root),
  );
  const untracked = command(
    "git",
    ["ls-files", "--others", "--exclude-standard", "-z", "--", ...pathspecs],
    root,
  )
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort();
  const hash = createHash("sha256");
  hash.update("shin-source-identity-v1\0");
  hash.update(commit);
  let trackedContentDirty = false;
  const objectFormat = command("git", ["rev-parse", "--show-object-format"], root)
    .toString("utf8")
    .trim();
  for (const entry of tracked) {
    if (entry.stage !== 0) {
      throw new Error(`Unsupported unmerged tracked source entry: ${entry.path}`);
    }
    const path = join(root, entry.path);
    hash.update("\0tracked\0");
    hash.update(entry.path);
    hash.update("\0");
    let stat;
    try {
      stat = lstatSync(path);
    } catch (error) {
      if (!isMissingPathError(error)) throw error;
      trackedContentDirty = true;
      hash.update("missing\0");
      continue;
    }
    const contents = sourceEntryContents(path, stat);
    const mode = sourceEntryMode(stat);
    hash.update(`${mode}\0`);
    hash.update(contents);
    if (mode !== entry.mode || gitObjectId(contents, objectFormat) !== entry.objectId) {
      trackedContentDirty = true;
    }
  }
  for (const relativePath of untracked) {
    const path = join(root, relativePath);
    const stat = lstatSync(path);
    hash.update("\0untracked\0");
    hash.update(relativePath);
    hash.update("\0");
    if (stat.isFile()) {
      hash.update(`${sourceEntryMode(stat)}\0`);
      hash.update(readFileSync(path));
    } else if (stat.isSymbolicLink()) {
      hash.update(`symlink\0${readlinkSync(path)}`);
    } else {
      throw new Error(`Unsupported untracked source entry: ${path}`);
    }
  }
  return {
    commit,
    dirty: diff.length > 0 || trackedContentDirty || untracked.length > 0,
    sourceTreeSha256: hash.digest("hex"),
  };
}

export function collectBuildToolchainIdentity(root = process.cwd()) {
  const cargoVersion = commandText("cargo", ["--version"], root);
  const rustcVersion = commandText("rustc", ["--version"], root);
  const cargoLambdaVersion = commandText("cargo", ["lambda", "--version"], root);
  const zigVersion = commandText("zig", ["version"], root);
  const executableIdentities = {
    cargo: executableSha256(rustupToolPath("cargo", root)),
    rustc: executableSha256(rustupToolPath("rustc", root)),
    cargoLambda: executableSha256(resolveExecutable("cargo-lambda", root)),
    zig: executableSha256(resolveExecutable("zig", root)),
    ...configuredBuildToolIdentities(root),
  };
  const configurationIdentities = cargoConfigurationIdentities(root);
  return {
    cargoVersion,
    rustcVersion,
    cargoLambdaVersion,
    zigVersion,
    buildToolchainSha256: createHash("sha256")
      .update(
        JSON.stringify({
          cargoVersion,
          rustcVersion,
          cargoLambdaVersion,
          zigVersion,
          executableIdentities,
          configurationIdentities,
        }),
      )
      .digest("hex"),
  };
}

function configuredBuildToolIdentities(root) {
  const identities = {};
  for (const name of [
    "AR",
    "CC",
    "CXX",
    "CARGO_BUILD_RUSTC_WRAPPER",
    "RUSTC_WRAPPER",
    "RUSTC_WORKSPACE_WRAPPER",
  ]) {
    const value = process.env[name];
    if (!value) continue;
    if (/\s/.test(value)) {
      throw new Error(`${name} must name one executable without arguments for benchmark builds.`);
    }
    identities[name] = executableSha256(resolveExecutable(value, root));
  }
  return identities;
}

function cargoConfigurationIdentities(root) {
  const cargoHome = resolve(root, process.env.CARGO_HOME ?? join(homedir(), ".cargo"));
  return Object.fromEntries(
    ["config", "config.toml"].map((name) => {
      try {
        return [
          name,
          createHash("sha256")
            .update(readFileSync(join(cargoHome, name)))
            .digest("hex"),
        ];
      } catch (error) {
        if (!isMissingPathError(error)) throw error;
        return [name, null];
      }
    }),
  );
}

function parseTrackedEntries(output) {
  return output
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((line) => {
      const match = /^(\d+) ([0-9a-f]+) (\d+)\t([\s\S]+)$/.exec(line);
      if (!match) throw new Error("Could not parse tracked source identity.");
      return {
        mode: match[1],
        objectId: match[2],
        stage: Number(match[3]),
        path: match[4],
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function sourceEntryContents(path, stat) {
  if (stat.isFile()) return readFileSync(path);
  if (stat.isSymbolicLink()) return Buffer.from(readlinkSync(path));
  throw new Error(`Unsupported tracked source entry: ${path}`);
}

function sourceEntryMode(stat) {
  if (stat.isSymbolicLink()) return "120000";
  if (stat.isFile()) return stat.mode & 0o111 ? "100755" : "100644";
  throw new Error("Unsupported source entry type.");
}

function gitObjectId(contents, algorithm) {
  return createHash(algorithm).update(`blob ${contents.length}\0`).update(contents).digest("hex");
}

function isMissingPathError(error) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function repositoryRelativePath(root, value) {
  const path = normalizePath(relative(root, resolve(root, value)));
  if (path === "" || path === ".." || path.startsWith("../") || isAbsolute(path)) {
    return undefined;
  }
  return path;
}

function normalizePath(value) {
  return value.replaceAll("\\", "/");
}

export function buildEnvironmentSha256(environment = process.env) {
  return environmentSha256(BUILD_ENVIRONMENT_NAMES, environment);
}

export function executionEnvironmentSha256(environment = process.env) {
  return environmentSha256(EXECUTION_ENVIRONMENT_NAMES, environment);
}

export function directorySha256(root) {
  const hash = createHash("sha256");
  const visit = (directory, relativeDirectory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).toSorted((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const path = join(directory, entry.name);
      const relativePath = normalizePath(join(relativeDirectory, entry.name));
      if (entry.isDirectory()) {
        hash.update(`directory\0${relativePath}\0`);
        visit(path, relativePath);
      } else if (entry.isFile()) {
        hash.update(`file\0${relativePath}\0${lstatSync(path).mode & 0o111}\0`);
        hash.update(readFileSync(path));
        hash.update("\0");
      } else if (entry.isSymbolicLink()) {
        hash.update(`symlink\0${relativePath}\0${readlinkSync(path)}\0`);
      } else {
        throw new Error(`Unsupported directory identity entry: ${path}`);
      }
    }
  };
  visit(resolve(root), "");
  return hash.digest("hex");
}

function environmentSha256(names, environment) {
  return createHash("sha256")
    .update(
      JSON.stringify(Object.fromEntries(names.map((name) => [name, environment[name] ?? null]))),
    )
    .digest("hex");
}

function rustupToolPath(name, cwd) {
  const result = tryCommand("rustup", ["which", name], cwd);
  return result === undefined
    ? resolveExecutable(name, cwd)
    : realpathSync(result.toString("utf8").trim());
}

function resolveExecutable(name, cwd = process.cwd()) {
  if (name.includes("/")) return realpathSync(resolve(cwd, name));
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (!directory) continue;
    try {
      const path = realpathSync(resolve(cwd, directory, name));
      if (lstatSync(path).isFile()) return path;
    } catch (error) {
      if (!isMissingPathError(error)) throw error;
    }
  }
  throw new Error(`Could not resolve executable: ${name}`);
}

function executableSha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function commandText(commandName, args, cwd) {
  return command(commandName, args, cwd).toString("utf8").trim();
}

function tryCommand(commandName, args, cwd) {
  const result = spawnSync(commandName, args, {
    cwd,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) return undefined;
  return Buffer.from(result.stdout);
}

function command(commandName, args, cwd) {
  const result = spawnSync(commandName, args, {
    cwd,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${commandName} ${args.join(" ")} failed: ${Buffer.from(result.stderr).toString("utf8").trim()}`,
    );
  }
  return Buffer.from(result.stdout);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = process.argv[2] ?? process.cwd();
  const excludedPaths = process.argv.slice(3);
  process.stdout.write(
    `${JSON.stringify({
      ...collectSourceIdentity(root, excludedPaths),
      ...collectBuildToolchainIdentity(root),
      buildEnvironmentSha256: buildEnvironmentSha256(),
      executionEnvironmentSha256: executionEnvironmentSha256(),
    })}\n`,
  );
}
