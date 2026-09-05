import { App, CfnParameter, Fn, Stack, Token } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import {
  type ISubnet,
  SecurityGroup,
  Subnet,
  SubnetFilter,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import type { CfnFunction } from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { describe, expect, test, vi } from "vitest";
import {
  ProviderSharing,
  ShinBucketDeployment,
  type ShinBucketDeploymentProviderLambdaOptions,
  Source,
} from "../../src";
import { testLocalProviderBuild } from "../support/bundling";

function isolatedVpc(stack: Stack): Vpc {
  return new Vpc(stack, "Vpc", {
    availabilityZones: ["eu-central-1a", "eu-central-1b"],
    natGateways: 0,
    subnetConfiguration: [{ name: "App", subnetType: SubnetType.PRIVATE_ISOLATED }],
  });
}

function deploy(
  stack: Stack,
  id: string,
  providerLambda: ShinBucketDeploymentProviderLambdaOptions,
): ShinBucketDeployment {
  return new ShinBucketDeployment(stack, id, {
    sources: [Source.data("index.txt", "subnet identity")],
    destination: { bucket: new Bucket(stack, `${id}Bucket`) },
    providerLambda,
  });
}

function handlerResource(stack: Stack, deployment: ShinBucketDeployment) {
  const handler = deployment.handlerFunction.node.defaultChild as CfnFunction;
  const resource =
    Template.fromStack(stack).findResources("AWS::Lambda::Function")[stack.getLogicalId(handler)];
  if (resource === undefined) throw new Error("Provider Lambda missing from template");
  return resource;
}

function capturedFilter(index: number): SubnetFilter {
  return { selectSubnets: (subnets: ISubnet[]) => subnets.slice(index, index + 1) };
}

describe("effective provider subnet selection", () => {
  test("distinguishes identical filter source with different captured subnet choices", () => {
    const stack = new Stack();
    const vpc = isolatedVpc(stack);
    const firstFilter = capturedFilter(0);
    const secondFilter = capturedFilter(1);
    expect(firstFilter.selectSubnets.toString()).toBe(secondFilter.selectSubnets.toString());

    const first = deploy(stack, "First", { vpc, vpcSubnets: { subnetFilters: [firstFilter] } });
    const second = deploy(stack, "Second", {
      vpc,
      vpcSubnets: { subnetFilters: [secondFilter] },
    });

    expect(first.handlerFunction === second.handlerFunction).toBe(false);
    expect(first.handlerFunction.node.id).not.toBe(second.handlerFunction.node.id);
    expect(handlerResource(stack, first).Properties.VpcConfig.SubnetIds).toEqual(
      stack.resolve([vpc.isolatedSubnets[0]?.subnetId]),
    );
    expect(handlerResource(stack, second).Properties.VpcConfig.SubnetIds).toEqual(
      stack.resolve([vpc.isolatedSubnets[1]?.subnetId]),
    );
  });

  test("evaluates prototype filter behavior rather than enumerable instance properties", () => {
    class FirstSubnet extends SubnetFilter {
      public selectSubnets(subnets: ISubnet[]): ISubnet[] {
        return subnets.slice(0, 1);
      }
    }
    class LastSubnet extends SubnetFilter {
      public selectSubnets(subnets: ISubnet[]): ISubnet[] {
        return subnets.slice(-1);
      }
    }
    const stack = new Stack();
    const vpc = isolatedVpc(stack);
    const first = deploy(stack, "First", {
      vpc,
      vpcSubnets: { subnetFilters: [new FirstSubnet()] },
    });
    const second = deploy(stack, "Second", {
      vpc,
      vpcSubnets: { subnetFilters: [new LastSubnet()] },
    });
    expect(first.handlerFunction === second.handlerFunction).toBe(false);
    expect(handlerResource(stack, second).Properties.VpcConfig.SubnetIds).toEqual(
      stack.resolve([vpc.isolatedSubnets[1]?.subnetId]),
    );
  });

  test.each(["shared", "isolated", "local"])(
    "evaluates a stateful selector once for a %s handler and emits that selection",
    (mode) => {
      const stack = new Stack();
      const vpc = isolatedVpc(stack);
      let calls = 0;
      const selectSubnets = vi.fn((subnets: ISubnet[]) => {
        const index = calls++ % subnets.length;
        return subnets.slice(index, index + 1);
      });
      const deployment = deploy(stack, "Deploy", {
        vpc,
        vpcSubnets: { subnetFilters: [{ selectSubnets }] },
        ...(mode === "isolated" ? { sharing: ProviderSharing.DEPLOYMENT } : {}),
        ...(mode === "local" ? { localBuild: testLocalProviderBuild() } : {}),
      });

      expect(handlerResource(stack, deployment).Properties.VpcConfig.SubnetIds).toEqual(
        stack.resolve([vpc.isolatedSubnets[0]?.subnetId]),
      );
      expect(selectSubnets).toHaveBeenCalledTimes(1);
    },
  );

  test("shares equivalent default, type, group, explicit, and filtered selections", () => {
    const stack = new Stack();
    const vpc = isolatedVpc(stack);
    const equivalentSelections = [
      undefined,
      {},
      { subnetType: SubnetType.PRIVATE_ISOLATED },
      { subnetGroupName: "App" },
      { subnets: vpc.isolatedSubnets },
      { subnetFilters: [SubnetFilter.byIds(vpc.isolatedSubnets.map((subnet) => subnet.subnetId))] },
      { availabilityZones: ["eu-central-1a", "eu-central-1b"], onePerAz: true },
    ];
    const deployments = equivalentSelections.map((vpcSubnets, index) =>
      deploy(stack, `Deploy${index}`, { vpc, vpcSubnets }),
    );

    const first = deployments[0];
    if (first === undefined) throw new Error("Default deployment missing");
    for (const deployment of deployments) {
      expect(deployment.handlerFunction === first.handlerFunction).toBe(true);
    }
    expect(handlerResource(stack, first).Properties.VpcConfig.SubnetIds).toEqual(
      stack.resolve(vpc.isolatedSubnets.map((subnet) => subnet.subnetId)),
    );
    expect(
      Object.keys(Template.fromStack(stack).findResources("AWS::Lambda::Function")),
    ).toHaveLength(1);
  });

  test("evaluates each caller's selector even when its effective handler already exists", () => {
    const stack = new Stack();
    const vpc = isolatedVpc(stack);
    const first = deploy(stack, "First", { vpc });
    const selectSubnets = vi.fn((subnets: ISubnet[]) => subnets);
    const second = deploy(stack, "Second", {
      vpc,
      vpcSubnets: { subnetFilters: [{ selectSubnets }] },
    });
    expect(second.handlerFunction).toBe(first.handlerFunction);
    expect(selectSubnets).toHaveBeenCalledTimes(1);
  });

  test("preserves emitted order and separates changed or reversed subnet lists", () => {
    const stack = new Stack();
    const vpc = isolatedVpc(stack);
    const first = deploy(stack, "First", { vpc, vpcSubnets: { subnets: vpc.isolatedSubnets } });
    const reversedSubnets = [...vpc.isolatedSubnets].reverse();
    const reversed = deploy(stack, "Reversed", { vpc, vpcSubnets: { subnets: reversedSubnets } });
    const changed = deploy(stack, "Changed", {
      vpc,
      vpcSubnets: { subnets: vpc.isolatedSubnets.slice(0, 1) },
    });
    expect(new Set([first, reversed, changed].map((entry) => entry.handlerFunction)).size).toBe(3);
    expect(handlerResource(stack, reversed).Properties.VpcConfig.SubnetIds).toEqual(
      stack.resolve(reversedSubnets.map((subnet) => subnet.subnetId)),
    );
  });

  test("shares imported subnets by resolved IDs rather than imported object or token identity", () => {
    const stack = new Stack();
    new CfnParameter(stack, "SubnetId", { type: "AWS::EC2::Subnet::Id" });
    new CfnParameter(stack, "OtherSubnetId", { type: "AWS::EC2::Subnet::Id" });
    const vpc = Vpc.fromVpcAttributes(stack, "Vpc", {
      vpcId: "vpc-imported",
      availabilityZones: ["eu-central-1a"],
      isolatedSubnetIds: [Fn.ref("SubnetId")],
      isolatedSubnetRouteTableIds: ["rtb-imported"],
    });
    const sameSubnet = Subnet.fromSubnetAttributes(stack, "SameSubnet", {
      subnetId: Token.asString({ resolve: () => ({ Ref: "SubnetId" }) }),
      availabilityZone: "eu-central-1a",
      routeTableId: "rtb-imported",
    });
    const otherSubnet = Subnet.fromSubnetAttributes(stack, "OtherSubnet", {
      subnetId: Fn.ref("OtherSubnetId"),
      availabilityZone: "eu-central-1a",
      routeTableId: "rtb-other",
    });
    expect(sameSubnet.subnetId).not.toBe(vpc.isolatedSubnets[0]?.subnetId);
    const first = deploy(stack, "First", { vpc });
    const equivalent = deploy(stack, "Equivalent", { vpc, vpcSubnets: { subnets: [sameSubnet] } });
    const changed = deploy(stack, "Changed", { vpc, vpcSubnets: { subnets: [otherSubnet] } });
    expect(equivalent.handlerFunction === first.handlerFunction).toBe(true);
    expect(changed.handlerFunction).not.toBe(first.handlerFunction);
    expect(handlerResource(stack, first).Properties.VpcConfig.SubnetIds).toEqual([
      { Ref: "SubnetId" },
    ]);
    expect(handlerResource(stack, changed).Properties.VpcConfig.SubnetIds).toEqual([
      { Ref: "OtherSubnetId" },
    ]);
  });

  test("keeps imported unresolved subnet identity stable across token registration order", () => {
    const render = (noiseCount: number) => {
      const stack = new Stack(new App(), "Stack");
      for (let index = 0; index < noiseCount; index++) Fn.ref(`Unused${index}`);
      const vpc = Vpc.fromVpcAttributes(stack, "Vpc", {
        vpcId: Fn.ref("VpcId"),
        availabilityZones: ["eu-central-1a", "eu-central-1b"],
        isolatedSubnetIds: Fn.split(",", Fn.ref("SubnetIds"), 2),
        isolatedSubnetRouteTableIds: ["rtb-first", "rtb-second"],
      });
      const deployment = deploy(stack, "Deploy", { vpc });
      return {
        tokenIds: vpc.isolatedSubnets.map((subnet) => subnet.subnetId),
        handlerId: deployment.handlerFunction.node.id,
        emittedIds: handlerResource(stack, deployment).Properties.VpcConfig.SubnetIds,
      };
    };
    const first = render(0);
    const later = render(7);
    expect(first.tokenIds).not.toEqual(later.tokenIds);
    expect(first.handlerId).toBe(later.handlerId);
    expect(first.emittedIds).toEqual(later.emittedIds);
    expect(first.emittedIds).toEqual(
      [0, 1].map((index) => ({
        "Fn::Select": [index, { "Fn::Split": [",", { Ref: "SubnetIds" }] }],
      })),
    );
  });

  test("retains each equivalent selection's connectivity dependencies and outbound rules", () => {
    const stack = new Stack();
    const vpc = new Vpc(stack, "Vpc", {
      availabilityZones: ["eu-central-1a", "eu-central-1b"],
      natGateways: 1,
    });
    const privateSubnet = vpc.privateSubnets[0];
    if (privateSubnet === undefined) throw new Error("Private subnet missing");
    const importedSubnet = Subnet.fromSubnetAttributes(stack, "ImportedPrivate", {
      subnetId: privateSubnet.subnetId,
      availabilityZone: privateSubnet.availabilityZone,
      routeTableId: privateSubnet.routeTable.routeTableId,
    });
    const imported = deploy(stack, "Imported", {
      vpc,
      vpcSubnets: { subnets: [importedSubnet] },
    });
    const defaultGroup = deploy(stack, "DefaultGroup", {
      vpc,
      vpcSubnets: { subnets: [privateSubnet] },
    });
    expect(defaultGroup.handlerFunction === imported.handlerFunction).toBe(true);
    const restrictedGroup = new SecurityGroup(stack, "RestrictedGroup", {
      vpc,
      allowAllOutbound: false,
    });
    const customGroup = deploy(stack, "CustomGroup", { vpc, securityGroups: [restrictedGroup] });
    const template = Template.fromStack(stack);
    const privateRouteIds = Object.keys(template.findResources("AWS::EC2::Route")).filter((id) =>
      id.includes("PrivateSubnet1"),
    );
    const unselectedRouteIds = Object.keys(template.findResources("AWS::EC2::Route")).filter((id) =>
      id.includes("PrivateSubnet2"),
    );
    expect(privateRouteIds).toHaveLength(1);
    expect(unselectedRouteIds).toHaveLength(1);
    for (const deployment of [defaultGroup, customGroup]) {
      expect(handlerResource(stack, deployment).DependsOn).toEqual(
        expect.arrayContaining(privateRouteIds),
      );
    }
    expect(handlerResource(stack, defaultGroup).DependsOn).not.toEqual(
      expect.arrayContaining(unselectedRouteIds),
    );
    const securityGroups = template.findResources("AWS::EC2::SecurityGroup");
    const egressRules = Object.values(securityGroups).map(
      (group) => group.Properties.SecurityGroupEgress,
    );
    expect(egressRules).toContainEqual([
      {
        CidrIp: "0.0.0.0/0",
        Description: "Allow all outbound traffic by default",
        IpProtocol: "-1",
      },
    ]);
    expect(egressRules).toContainEqual([
      {
        CidrIp: "255.255.255.255/32",
        Description: "Disallow all traffic",
        FromPort: 252,
        IpProtocol: "icmp",
        ToPort: 86,
      },
    ]);
  });

  test("still rejects public subnet placement and incompatible selection properties", () => {
    const stack = new Stack();
    const vpc = new Vpc(stack, "Vpc", { maxAzs: 2, natGateways: 0 });
    expect(() =>
      deploy(stack, "Public", { vpc, vpcSubnets: { subnets: vpc.publicSubnets } }),
    ).toThrow(/Lambda Functions in a public subnet/);
    expect(() =>
      deploy(stack, "Conflicting", {
        vpc,
        vpcSubnets: { subnets: vpc.isolatedSubnets, subnetType: SubnetType.PRIVATE_ISOLATED },
      }),
    ).toThrow(/subnetType.*subnets|subnets.*subnetType/);
  });

  test("rejects subnet selection without a VPC even after a default handler exists", () => {
    const stack = new Stack();
    deploy(stack, "Default", {});
    expect(() => deploy(stack, "MissingVpc", { vpcSubnets: {} })).toThrow(
      /Cannot configure 'vpcSubnets' without configuring a VPC/,
    );
  });
});
