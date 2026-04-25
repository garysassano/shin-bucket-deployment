# Example Stacks

Examples are driven through the repository runner:

```bash
pnpm example list
pnpm example synth simple
pnpm example deploy cloudfront-sync
pnpm example destroy retain-on-delete
```

| Example | File | Purpose |
| --- | --- | --- |
| Simple asset deploy | [examples/simple-app.ts](../examples/simple-app.ts) | Plain deployment under `site/`. |
| Replacement behavior | [examples/replacement-behavior-app.ts](../examples/replacement-behavior-app.ts) | Replacement behavior across `asset`, `data`, JSON, and YAML sources. |
| CloudFront invalidation (sync) | [examples/cloudfront-invalidation-sync-app.ts](../examples/cloudfront-invalidation-sync-app.ts) | Stack waits for invalidation completion. |
| CloudFront invalidation (async) | [examples/cloudfront-invalidation-async-app.ts](../examples/cloudfront-invalidation-async-app.ts) | Stack returns before invalidation completes. |
| Metadata and filters | [examples/metadata-filters-app.ts](../examples/metadata-filters-app.ts) | Include/exclude and metadata behavior. |
| Prune update | [examples/prune-update-v1-app.ts](../examples/prune-update-v1-app.ts), [examples/prune-update-v2-app.ts](../examples/prune-update-v2-app.ts) | Update path that removes no-longer-deployed objects. |
| Retain on delete | [examples/retain-on-delete-v1-app.ts](../examples/retain-on-delete-v1-app.ts), [examples/retain-on-delete-v2-app.ts](../examples/retain-on-delete-v2-app.ts) | Update/delete path when `retainOnDelete: true`. |
