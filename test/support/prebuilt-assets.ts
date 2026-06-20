import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const repoRoot = join(__dirname, "..", "..");

export function ensurePrebuiltBootstrapAssets(): () => void {
  const created: string[] = [];

  for (const arch of ["arm64", "x86_64"]) {
    const bootstrapPath = join(repoRoot, "assets", `bootstrap-${arch}`, "bootstrap");
    if (existsSync(bootstrapPath)) {
      continue;
    }

    mkdirSync(dirname(bootstrapPath), { recursive: true });
    writeFileSync(bootstrapPath, "#!/bin/sh\nexit 0\n");
    chmodSync(bootstrapPath, 0o755);
    created.push(bootstrapPath);
  }

  return () => {
    for (const bootstrapPath of created) {
      rmSync(bootstrapPath, { force: true });
      rmSync(dirname(bootstrapPath), { recursive: true, force: true });
    }
  };
}
