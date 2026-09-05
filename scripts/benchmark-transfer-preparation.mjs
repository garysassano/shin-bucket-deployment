import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { cpus, release, tmpdir, totalmem } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const run = (program, args) => execFileSync(program, args, { cwd: root, encoding: "utf8" }).trim();
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = ["--manifest-path", "rust/Cargo.toml"];
const args = process.argv.slice(2);
if (args.length !== 0 && (args.length !== 2 || args[0] !== "--fixtures-dir")) {
  throw new Error("Usage: pnpm rust:bench:transfer [--fixtures-dir <external-directory>]");
}
const fixtureDir = args[1]
  ? resolve(args[1])
  : mkdtempSync(join(tmpdir(), "shin-transfer-fixtures-"));
process.stderr.write(`Transfer fixtures (reuse for comparisons): ${fixtureDir}\n`);

// Includes the architecture guard introduced with production/test codec parity.
execFileSync("bash", ["scripts/check-deflate-features.sh"], {
  cwd: root,
  stdio: ["ignore", "ignore", "inherit"],
});
const rustc = run("rustc", ["-vV"]);
const target = rustc.match(/^host: (.+)$/m)?.[1];
if (!target) throw new Error("rustc did not identify its host target");
const treeArgs = [
  "tree",
  "--locked",
  ...manifest,
  "--target",
  target,
  "--invert",
  "flate2",
  "--depth",
  "0",
  "--prefix",
  "none",
  "--format",
  "{p} {f}",
];
const normalCodec = run("cargo", [...treeArgs, "--edges", "normal,build"]);
const benchCodec = run("cargo", [
  ...treeArgs,
  "--edges",
  "normal,build,dev",
  "--features",
  "bench-internals",
]);
if (!normalCodec || normalCodec !== benchCodec)
  throw new Error("host production and benchmark codecs differ");
const backend = normalCodec.includes("zlib-rs")
  ? "zlib-rs"
  : normalCodec.includes("zlib-ng")
    ? "zlib-ng"
    : normalCodec.includes("libz-sys")
      ? "zlib"
      : normalCodec.includes("rust_backend")
        ? "miniz_oxide"
        : undefined;
if (!backend) throw new Error(`Unrecognized codec selection: ${normalCodec}`);
const paths = run("git", [
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
  "rust",
  "mise.toml",
  "scripts/benchmark-transfer-preparation.mjs",
])
  .split("\n")
  .filter(Boolean)
  .sort();
const inputs = createHash("sha256");
for (const path of paths)
  inputs
    .update(path)
    .update("\0")
    .update(readFileSync(resolve(root, path)))
    .update("\0");
const provenance = {
  sourceCommit: run("git", ["rev-parse", "HEAD"]),
  dirty: run("git", ["status", "--porcelain"]).length > 0,
  sourceInputsSha256: inputs.digest("hex"),
  cargoLockSha256: sha256(readFileSync(resolve(root, "rust/Cargo.lock"))),
  rustc,
  cargo: run("cargo", ["--version"]),
  target,
  backend,
  codecFeatures: normalCodec,
  profile: "release",
  rustflags: process.env.RUSTFLAGS ?? "",
  encodedRustflags: process.env.CARGO_ENCODED_RUSTFLAGS ?? "",
  profileOverrides: Object.fromEntries(
    Object.entries(process.env).filter(([name]) => name.startsWith("CARGO_PROFILE_RELEASE_")),
  ),
  environment: {
    platform: process.platform,
    kernel: release(),
    cpu: cpus()[0]?.model,
    logicalCpus: cpus().length,
    memoryMiB: Math.round(totalmem() / 1048576),
  },
  runtimeThreads: 1,
  detailedFailureDiagnostics: true,
  spoolConcurrencySetting: 64,
  spoolLimitBytes: 262144,
  sourceBlockBytes: 8388608,
  sourceMode: "resident-fixture-no-network",
};
const built = spawnSync(
  "cargo",
  [
    "bench",
    "--locked",
    ...manifest,
    "--target",
    target,
    "--bench",
    "transfer_preparation",
    "--features",
    "bench-internals",
    "--no-run",
    "--message-format=json",
  ],
  {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SHIN_TRANSFER_BENCH_PROVENANCE: JSON.stringify(provenance) },
  },
);
process.stderr.write(built.stderr ?? "");
const messages = (built.stdout ?? "")
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));
for (const message of messages) {
  if (message.reason === "compiler-message" && message.message.rendered)
    process.stderr.write(message.message.rendered);
}
if (built.error) throw built.error;
if (built.status !== 0) process.exit(built.status ?? 1);
const executable = messages.find(
  (message) =>
    message.reason === "compiler-artifact" &&
    message.target.name === "transfer_preparation" &&
    message.executable,
)?.executable;
if (!executable) throw new Error("Cargo did not report the transfer benchmark executable");
console.log(
  JSON.stringify({
    kind: "transfer-preparation-build",
    schemaVersion: 1,
    binarySha256: sha256(readFileSync(executable)),
    buildId: sha256(JSON.stringify(provenance)),
    ...provenance,
  }),
);
const measured = spawnSync(executable, ["--fixtures-dir", fixtureDir], {
  cwd: root,
  stdio: "inherit",
});
if (measured.error) throw measured.error;
process.exit(measured.status ?? 1);
