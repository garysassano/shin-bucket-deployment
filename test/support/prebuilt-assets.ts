import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const repoRoot = join(__dirname, "..", "..");

// Own fixture archives for the entire Vitest run: a suite that finishes early
// must not delete archives still in use by another worker.
export default function setupPrebuiltBootstrapAssets(): () => void {
  const created: string[] = [];

  for (const arch of ["arm64", "x86_64"]) {
    const archivePath = join(repoRoot, "assets", `bootstrap-${arch}`, "bootstrap.zip");
    if (existsSync(archivePath)) {
      continue;
    }

    mkdirSync(dirname(archivePath), { recursive: true });
    writeFileSync(archivePath, `test bootstrap archive for ${arch}\n`);
    created.push(archivePath);
  }

  return () => {
    for (const archivePath of created) {
      rmSync(archivePath, { force: true });
    }
  };
}
