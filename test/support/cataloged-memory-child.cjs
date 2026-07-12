const { App, Stack } = require("aws-cdk-lib");
const { Role, ServicePrincipal } = require("aws-cdk-lib/aws-iam");
const { writeFileSync } = require("node:fs");
const { Source } = require("../../dist/src");

const [sourceDirectory, outdir, resultPath] = process.argv.slice(2);
if (!sourceDirectory || !outdir || !resultPath) {
  throw new Error("expected source, output, and result paths");
}

const app = new App({ outdir });
const stack = new Stack(app, "MemoryStack");
const handlerRole = new Role(stack, "HandlerRole", {
  assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
});
Source.asset(sourceDirectory).bind(stack, { handlerRole });
app.synth();

writeFileSync(resultPath, JSON.stringify({ maxRssKb: process.resourceUsage().maxRSS }));
