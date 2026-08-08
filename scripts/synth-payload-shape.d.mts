export declare const REQUIRED_PAYLOAD_PATHS: string[][];

export declare function assertPayloadTree(value: unknown): void;

export declare function assertPayloadWithinSynthShape(payload: unknown): void;

export declare function assertPayloadPaths(
  payload: Record<string, unknown>,
  paths?: string[][],
): void;
