export type PayloadNode =
  | null
  | PayloadNode[]
  | { readonly [key: string]: PayloadNode };

export declare const EXPECTED_DEFAULT_PAYLOAD_TREE: PayloadNode;
export declare const REQUIRED_PAYLOAD_PATHS: string[][];

export declare function assertPayloadTree(
  value: unknown,
  tree: PayloadNode,
  path?: string[],
): void;

export declare function assertPayloadWithinSynthShape(
  payload: Record<string, unknown>,
  tree?: PayloadNode,
  path?: string[],
): void;

export declare function assertPayloadPaths(
  payload: Record<string, unknown>,
  paths?: string[][],
): void;
