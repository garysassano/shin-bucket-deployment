#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)

# Ask Cargo for only flate2's resolved version/features. Compare the shipped
# binary graph with the all-features test graph without snapshotting dependencies
# or deciding which backend a future, separately measured runtime change should use.
for target in aarch64-unknown-linux-gnu x86_64-unknown-linux-gnu; do
  args=(
    tree --locked --manifest-path "$repo_root/rust/Cargo.toml"
    --target "$target" --invert flate2 --depth 0 --prefix none
    --format '{p} {f}'
  )
  production=$(cargo "${args[@]}" --edges normal,build)
  tests=$(cargo "${args[@]}" --edges normal,build,dev --all-features)
  if [[ -z "$production" || "$production" != "$tests" ]]; then
    printf 'DEFLATE feature mismatch for %s\nproduction: %s\ntests:      %s\n' \
      "$target" "$production" "$tests" >&2
    exit 1
  fi
  printf '%s: %s (production and tests match)\n' "$target" "$production"
done
