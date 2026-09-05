import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { afterEach, expect, test } from "vitest";
import { ProviderSharing, ShinBucketDeployment, Source } from "../../src";
import type { ShinBucketDeploymentLocalBuildOptions } from "../../src/local-build";

const scratchDirectories: string[] = [];
afterEach(() => {
  for (const directory of scratchDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function scratch(): string {
  const directory = mkdtempSync(join(tmpdir(), "shin-local-provider-"));
  scratchDirectories.push(directory);
  return directory;
}

function project(root: string, name: string, source: string): string {
  const path = join(root, name);
  mkdirSync(join(path, "src"), { recursive: true });
  writeFileSync(
    join(path, "Cargo.toml"),
    '[package]\nname = "shin-bucket-deployment-handler"\nversion = "0.0.0"\nedition = "2021"\n',
  );
  writeFileSync(join(path, "src", "main.rs"), source);
  return path;
}

// Exercise cargo-lambda-cdk's real bundling entry with an inexpensive local
// output writer. Both the selected tree and captured hook affect the output.
function localBuild(
  projectPath: string,
  captured: string,
  calls: string[],
): ShinBucketDeploymentLocalBuildOptions {
  return {
    projectPath,
    bundling: {
      commandHooks: {
        beforeBundling: () => [`echo ${captured}`],
        afterBundling: () => [],
      },
      dockerOptions: {
        local: {
          tryBundle(outputDir) {
            calls.push(`${projectPath}:${captured}`);
            mkdirSync(outputDir, { recursive: true });
            const bootstrap = join(outputDir, "bootstrap");
            writeFileSync(
              bootstrap,
              `#!/bin/sh\n# ${readFileSync(join(projectPath, "src", "main.rs"), "utf8")}\n# ${captured}\nexit 0\n`,
            );
            chmodSync(bootstrap, 0o755);
            return true;
          },
        },
      },
    },
  };
}

function deploy(
  stack: Stack,
  id: string,
  build: ShinBucketDeploymentLocalBuildOptions,
  architecture = Architecture.ARM_64,
) {
  return new ShinBucketDeployment(stack, id, {
    sources: [Source.data("index.txt", "ok")],
    destination: { bucket: new Bucket(stack, `${id}Bucket`) },
    providerLambda: { localBuild: build, architecture },
  });
}

test.each([Architecture.ARM_64, Architecture.X86_64])(
  "builds both same-manifest source trees independently on %s",
  (architecture) => {
    const root = scratch();
    const firstPath = project(root, "first", 'fn main() { println!("first"); }');
    const secondPath = project(root, "second", 'fn main() { println!("second"); }');
    expect(readFileSync(join(firstPath, "Cargo.toml"))).toEqual(
      readFileSync(join(secondPath, "Cargo.toml")),
    );
    const calls: string[] = [];
    const stack = new Stack(new App({ outdir: join(root, "assembly") }), "LocalBuildStack");
    const first = deploy(stack, "First", localBuild(firstPath, "same-hook", calls), architecture);
    const second = deploy(
      stack,
      "Second",
      localBuild(secondPath, "same-hook", calls),
      architecture,
    );

    expect(calls).toEqual([`${firstPath}:same-hook`, `${secondPath}:same-hook`]);
    expect(first.handlerFunction).not.toBe(second.handlerFunction);
    expect(first.handlerRole).not.toBe(second.handlerRole);
    expect(first.handlerFunction.node.scope).toBe(first);
    expect(second.handlerFunction.node.scope).toBe(second);
    const functions = Object.values(
      Template.fromStack(stack).findResources("AWS::Lambda::Function"),
    );
    expect(functions).toHaveLength(2);
    expect(functions[0]?.Properties.Code).not.toEqual(functions[1]?.Properties.Code);
    for (const fn of functions) expect(fn.Properties.Architectures).toEqual([architecture.name]);
  },
);

test("builds the same source with different captured hook values independently", () => {
  const root = scratch();
  const projectPath = project(root, "provider", "fn main() {}");
  const calls: string[] = [];
  const firstBuild = localBuild(projectPath, "first-hook", calls);
  const secondBuild = localBuild(projectPath, "second-hook", calls);
  expect(firstBuild.bundling?.commandHooks?.beforeBundling.toString()).toBe(
    secondBuild.bundling?.commandHooks?.beforeBundling.toString(),
  );
  const stack = new Stack(new App({ outdir: join(root, "assembly") }), "CapturedHookStack");
  const first = deploy(stack, "First", firstBuild);
  const second = deploy(stack, "Second", secondBuild);

  expect(calls).toEqual([`${projectPath}:first-hook`, `${projectPath}:second-hook`]);
  expect(first.handlerFunction).not.toBe(second.handlerFunction);
  const functions = Object.values(Template.fromStack(stack).findResources("AWS::Lambda::Function"));
  expect(functions[0]?.Properties.Code).not.toEqual(functions[1]?.Properties.Code);
});

test("rejects explicit stack sharing before local provider resources or bundling", () => {
  const stack = new Stack();
  const bucket = new Bucket(stack, "Bucket");
  const root = scratch();
  const calls: string[] = [];
  expect(
    () =>
      new ShinBucketDeployment(stack, "Deploy", {
        sources: [Source.data("index.txt", "ok")],
        destination: { bucket },
        providerLambda: {
          sharing: ProviderSharing.STACK,
          localBuild: localBuild(project(root, "provider", "fn main() {}"), "hook", calls),
        },
      }),
  ).toThrow(expect.objectContaining({ code: "ShinBucketDeploymentLocalProviderBuildSharing" }));
  expect(calls).toEqual([]);
  expect(stack.node.findChild("Deploy").node.children).toEqual([]);
  expect(stack.node.findAll().filter((node) => node.constructor.name === "CfnFunction")).toEqual(
    [],
  );
});

test("keeps local handler identities stable across checkout moves and source or hook edits", () => {
  function synth(source: string, captured: string, sharing?: ProviderSharing.DEPLOYMENT) {
    const root = scratch();
    const stack = new Stack(new App({ outdir: join(root, "assembly") }), "StableLocalStack");
    const deployment = new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.txt", "ok")],
      destination: { bucket: new Bucket(stack, "Bucket") },
      providerLambda: {
        sharing,
        localBuild: localBuild(project(root, "provider", source), captured, []),
      },
    });
    const template = Template.fromStack(stack);
    const handlerEntry = Object.entries(template.findResources("AWS::Lambda::Function"))[0];
    const resourceEntry = Object.entries(
      template.findResources("AWS::CloudFormation::CustomResource"),
    )[0];
    if (!handlerEntry || !resourceEntry) throw new Error("Provider resources not found");
    const [handlerId, handler] = handlerEntry;
    const [resourceId, resource] = resourceEntry;
    return {
      handlerNodeId: deployment.handlerFunction.node.id,
      handlerId,
      resourceId,
      code: handler.Properties.Code,
      serviceToken: resource.Properties.ServiceToken,
      owner: resource.Properties.DestinationOwnerId,
    };
  }
  const initial = synth("fn main() {}", "first-hook");
  const moved = synth("fn main() {}", "first-hook", ProviderSharing.DEPLOYMENT);
  expect(moved).toEqual(initial);
  const updated = synth('fn main() { println!("changed"); }', "second-hook");
  expect(updated.code).not.toEqual(initial.code);
  expect({ ...updated, code: undefined }).toEqual({ ...initial, code: undefined });
  expect(updated.handlerNodeId).toBe("ShinBucketDeploymentHandler");
});

test("replaces a shared provider with an isolated local build and a distinct ownership tag", () => {
  function synth(local: boolean) {
    const root = scratch();
    const stack = new Stack(new App({ outdir: join(root, "assembly") }), "ReplacementStack");
    new ShinBucketDeployment(stack, "Deploy", {
      sources: [Source.data("index.txt", "ok")],
      destination: { bucket: new Bucket(stack, "Bucket"), keyPrefix: "site" },
      destinationLifecycle: { onDelete: { deleteCurrentObjects: true } },
      providerLambda: local
        ? { localBuild: localBuild(project(root, "provider", "fn main() {}"), "hook", []) }
        : {},
    });
    const template = Template.fromStack(stack);
    const resource = Object.entries(
      template.findResources("AWS::CloudFormation::CustomResource"),
    )[0];
    const bucket = Object.values(template.findResources("AWS::S3::Bucket"))[0];
    if (!resource || !bucket) throw new Error("Deployment resources not found");
    return { resource, tags: bucket.Properties.Tags };
  }
  const previous = synth(false);
  const isolated = synth(true);
  expect(isolated.resource[0]).not.toBe(previous.resource[0]);
  expect(isolated.resource[1].Properties.ServiceToken).not.toEqual(
    previous.resource[1].Properties.ServiceToken,
  );
  const owner = isolated.resource[1].Properties.DestinationOwnerId;
  expect(owner).not.toBe(previous.resource[1].Properties.DestinationOwnerId);
  expect(isolated.tags).toContainEqual({ Key: `aws-cdk:cr-owned:site:${owner}`, Value: "true" });
  expect(isolated.tags).not.toEqual(previous.tags);
  expect(isolated.resource[1].Properties.DestinationLifecycle.OnDelete.DeleteCurrentObjects).toBe(
    true,
  );
});
