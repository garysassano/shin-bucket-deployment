import { describe, expect, it } from "vitest";
import { assertObjectMissing } from "../scenarios/verifiers/destination-move-matrix";

describe("destination move matrix verifier", () => {
  it("accepts only a successful listing that excludes the exact key", () => {
    expect(() =>
      assertObjectMissing("bucket", "previous/object.txt", () => JSON.stringify({ KeyCount: 0 })),
    ).not.toThrow();
    expect(() =>
      assertObjectMissing("bucket", "previous/object.txt", () =>
        JSON.stringify({
          KeyCount: 1,
          Contents: [{ Key: "previous/object.txt.neighbor" }],
        }),
      ),
    ).not.toThrow();
    expect(() =>
      assertObjectMissing("bucket", "previous/object.txt", () =>
        JSON.stringify({ KeyCount: 1, Contents: [{ Key: "previous/object.txt" }] }),
      ),
    ).toThrow("should have been deleted");
  });

  it("does not interpret AWS or response-shape failures as absence", () => {
    expect(() =>
      assertObjectMissing("bucket", "previous/object.txt", () => {
        throw new Error("simulated AWS request failure");
      }),
    ).toThrow("simulated AWS request failure");
    expect(() =>
      assertObjectMissing("bucket", "previous/object.txt", () => JSON.stringify({ KeyCount: 1 })),
    ).toThrow("unexpected response shape");
    expect(() => assertObjectMissing("bucket", "previous/object.txt", () => "not-json")).toThrow(
      "invalid JSON",
    );
  });
});
