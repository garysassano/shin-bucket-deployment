import { App, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { describe, expect, test } from "vitest";
import { normalizeSingletonValue, stableStringify } from "../src/stable-json";

/**
 * `stableStringify` decides shared-handler identity: its output is hashed into
 * the provider handler's construct ID, which is in turn embedded in the custom
 * resource's logical ID. A change in its output replaces the custom resource,
 * so the edge cases its own doc comment claims are pinned here rather than
 * being re-derived from the implementation.
 */
describe("stableStringify", () => {
  test("orders object keys by code unit, not by locale collation", () => {
    // ICU collation sorts "a" before "B"; code-unit order does the reverse.
    // This is the case that made the previous localeCompare form depend on the
    // runtime's ICU build for a value that decides handler identity.
    expect(stableStringify({ a: 1, B: 2 })).toBe('{"B":2,"a":1}');
    expect(stableStringify({ B: 2, a: 1 })).toBe('{"B":2,"a":1}');
    expect(stableStringify({ Z: 1, a: 2, A: 3 })).toBe('{"A":3,"Z":1,"a":2}');
  });

  test("reorders a mixed-case caller key map relative to ICU collation", () => {
    // Mixed-case maps keep deterministic ordering at every call site.
    expect(stableStringify({ cargoHome: "/tmp", RUSTFLAGS: "-C x" })).toBe(
      '{"RUSTFLAGS":"-C x","cargoHome":"/tmp"}',
    );
    expect(stableStringify({ SSL_CERT_FILE: "/p", CARGO_HOME: "/tmp", RUSTFLAGS: "-C x" })).toBe(
      '{"CARGO_HOME":"/tmp","RUSTFLAGS":"-C x","SSL_CERT_FILE":"/p"}',
    );
  });

  test("is insensitive to insertion order at every depth", () => {
    const left = { outer: { b: 1, a: { d: 2, c: 3 } }, first: true };
    const right = { first: true, outer: { a: { c: 3, d: 2 }, b: 1 } };

    expect(stableStringify(left)).toBe(stableStringify(right));
  });

  test("drops undefined object entries but keeps null and preserves array holes", () => {
    expect(stableStringify({ a: undefined, b: null })).toBe('{"b":null}');
    // Arrays are mapped, not filtered, so positions are preserved.
    expect(stableStringify([1, undefined, 2])).toBe("[1,null,2]");
    expect(stableStringify(undefined)).toBe(undefined);
  });

  test("distinguishes an absent key from an explicitly null one", () => {
    expect(stableStringify({ a: 1 })).not.toBe(stableStringify({ a: 1, b: null }));
  });

  test("serializes function source without claiming to identify captured values", () => {
    const first = stableStringify({ fn: () => 1 });
    const second = stableStringify({ fn: () => 1 });
    const third = stableStringify({ fn: () => 2 });

    expect(first).toBe(second);
    expect(first).not.toBe(third);
  });

  test("serializes constructs by tree address rather than object identity", () => {
    const stack = new Stack(new App(), "Stack");
    const one = new Construct(stack, "One");
    const two = new Construct(stack, "Two");

    expect(stableStringify({ scope: one })).toBe(
      JSON.stringify({ scope: { __construct__: one.node.addr } }),
    );
    expect(stableStringify({ scope: one })).not.toBe(stableStringify({ scope: two }));
  });

  test("keeps astral and non-ASCII keys deterministic", () => {
    const emoji = "\u{1F600}";
    const bmp = "\uFFFD";
    const forward = stableStringify({ [emoji]: 1, [bmp]: 2, plain: 3 });
    const reversed = stableStringify({ plain: 3, [bmp]: 2, [emoji]: 1 });

    expect(forward).toBe(reversed);
    // UTF-16 code-unit order puts the astral character's high surrogate
    // (0xD83D) below U+FFFD, which is the documented divergence from UTF-8
    // byte order.
    expect(forward.indexOf(emoji)).toBeLessThan(forward.indexOf(bmp));
  });

  test("renders values with no JSON representation as strings", () => {
    expect(normalizeSingletonValue(10n)).toBe("10");
    expect(normalizeSingletonValue(Symbol("x"))).toBe("Symbol(x)");
  });

  test("passes primitives and null through unchanged", () => {
    expect(stableStringify("text")).toBe('"text"');
    expect(stableStringify(0)).toBe("0");
    expect(stableStringify(false)).toBe("false");
    expect(stableStringify(null)).toBe("null");
  });
});
