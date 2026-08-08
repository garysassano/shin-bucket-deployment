import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync, realpathSync } from "node:fs";
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

// The files that determine the provider binary, and nothing else. The
// freshness gate compares the staged bootstrap against these; the full-tree
// `sourceTreeSha256` stays in the provenance for evidence attribution, but an
// unrelated dirty file (a README edit, uncommitted benchmark rows) must not
// invalidate a byte-identical provider archive.
const PROVIDER_INPUT_ROOT_FILES = [
  "mise.toml",
  "rust-toolchain.toml",
  "rust/Cargo.toml",
  "rust/Cargo.lock",
  "rust/build.rs",
  "rust/.cargo/config.toml",
];
const PROVIDER_INPUT_SOURCE_DIR = "rust/src";
const PROVIDER_INPUT_PATHSPECS = [
  PROVIDER_INPUT_SOURCE_DIR,
  ...PROVIDER_INPUT_ROOT_FILES,
];

/**
 * The provider-build-input identity: a digest over the working-tree contents
 * that determine the provider binary (rust sources, manifests, lockfile, and
 * the toolchain pins in `mise.toml`/`rust-toolchain.toml`), plus whether any
 * of those inputs differ from HEAD.
 *
 * `rust/target/` is deliberately absent: it holds build output, not input.
 * Untracked source files are included because they change what cargo would
 * compile; stray files outside `rust/src/` are not, so a scratch file cannot
 * make a byte-identical archive look stale.
 */
export function collectProviderBuildInputIdentity(repositoryRoot) {
  const root = resolve(repositoryRoot);
  const hash = createHash("sha256");
  hash.update("shin-provider-input-v1\0");
  for (const relativePath of PROVIDER_INPUT_ROOT_FILES) {
    hashProviderBuildInputFile(hash, root, relativePath);
  }
  const sourceRoot = join(root, PROVIDER_INPUT_SOURCE_DIR);
  if (existsSync(sourceRoot)) {
    hashProviderBuildInputTree(hash, sourceRoot, PROVIDER_INPUT_SOURCE_DIR);
  } else {
    hash.update(`missing-dir\0${PROVIDER_INPUT_SOURCE_DIR}\0`);
  }
  return {
    providerInputSha256: hash.digest("hex"),
    providerInputDirty: providerBuildInputsDirty(root),
  };
}

function hashProviderBuildInputFile(hash, root, relativePath) {
  const path = join(root, relativePath);
  hashProviderBuildInputPath(hash, path, relativePath);
}

function hashProviderBuildInputPath(hash, path, relativePath) {
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (!isMissingPathError(error)) throw error;
    hash.update(`absent\0${relativePath}\0`);
    return;
  }
  if (!stat.isFile() && !stat.isSymbolicLink()) {
    throw new Error(`Unsupported provider build input entry: ${path}`);
  }
  hash.update(`file\0${relativePath}\0${sourceEntryMode(stat)}\0`);
  hash.update(sourceEntryContents(path, stat));
  hash.update("\0");
}

function hashProviderBuildInputTree(hash, directory, relativeDirectory) {
  for (const entry of readdirSync(directory, { withFileTypes: true }).toSorted((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const path = join(directory, entry.name);
    const relativePath = normalizePath(join(relativeDirectory, entry.name));
    // Build output, never input: cargo writes the compiled binary tree here,
    // and a build must not invalidate the digest it is recorded against.
    if (entry.isDirectory() && entry.name === "target") {
      hash.update(`excluded-dir\0${relativePath}\0`);
      continue;
    }
    if (entry.isDirectory()) {
      hash.update(`directory\0${relativePath}\0`);
      hashProviderBuildInputTree(hash, path, relativePath);
    } else if (entry.isFile()) {
      hashProviderBuildInputPath(hash, path, relativePath);
    } else if (entry.isSymbolicLink()) {
      hash.update(`symlink\0${relativePath}\0${readlinkSync(path)}\0`);
    } else {
      throw new Error(`Unsupported provider build input entry: ${path}`);
    }
  }
}

function providerBuildInputsDirty(root) {
  const diff = command(
    "git",
    ["diff", "--binary", "--no-ext-diff", "HEAD", "--", ...PROVIDER_INPUT_PATHSPECS],
    root,
  );
  if (diff.length > 0) {
    return true;
  }
  const tracked = parseTrackedEntries(
    command("git", ["ls-files", "--stage", "-z", "--", ...PROVIDER_INPUT_PATHSPECS], root),
  );
  const untracked = command(
    "git",
    ["ls-files", "--others", "--exclude-standard", "-z", "--", ...PROVIDER_INPUT_PATHSPECS],
    root,
  )
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  if (untracked.length > 0) {
    return true;
  }
  const objectFormat = command("git", ["rev-parse", "--show-object-format"], root)
    .toString("utf8")
    .trim();
  for (const entry of tracked) {
    if (entry.stage !== 0) {
      throw new Error(`Unsupported unmerged provider build input: ${entry.path}`);
    }
    const path = join(root, entry.path);
    let stat;
    try {
      stat = lstatSync(path);
    } catch (error) {
      if (!isMissingPathError(error)) throw error;
      return true;
    }
    if (sourceEntryMode(stat) !== entry.mode) {
      return true;
    }
    if (gitObjectId(sourceEntryContents(path, stat), objectFormat) !== entry.objectId) {
      return true;
    }
  }
  return false;
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
