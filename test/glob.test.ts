import { describe, expect, test } from "vitest";
import { globSyntaxError } from "../src/glob";

describe("globSyntaxError", () => {
  test("accepts plain literal patterns", () => {
    for (const pattern of ["", "index.html", "assets/app.js", "a/b/c.txt", "with space"]) {
      expect(globSyntaxError(pattern), pattern).toBeUndefined();
    }
  });

  test("accepts wildcards, question marks, and recursive stars", () => {
    for (const pattern of ["*", "**", "**/*", "a/**/b", "?.txt", "a*b?c"]) {
      expect(globSyntaxError(pattern), pattern).toBeUndefined();
    }
  });

  test("rejects a dangling escape", () => {
    expect(globSyntaxError("assets\\")).toMatch(/dangling escape/);
  });

  test("accepts escaped characters", () => {
    for (const pattern of ["\\*", "a\\[b", "\\{x\\}", "\\\\", "a\\b"]) {
      expect(globSyntaxError(pattern), pattern).toBeUndefined();
    }
  });

  test.each([
    "[",
    "a[",
    "[]",
    "[!]",
    "[abc",
    "[!abc",
  ])("rejects an unclosed character class: %s", (pattern) => {
    expect(globSyntaxError(pattern)).toMatch(/unclosed character class/);
  });

  test.each(["[z-a]", "[z--]", "[b-a]x"])("rejects an invalid range: %s", (pattern) => {
    expect(globSyntaxError(pattern)).toMatch(/invalid character class range/);
  });

  test("accepts classes with a first-position or last-position dash", () => {
    for (const pattern of ["[-a]", "[a-]", "[a-b-c]", "[\\]]", "[[]", "[a]b"]) {
      expect(globSyntaxError(pattern), pattern).toBeUndefined();
    }
  });

  test("accepts a negated class", () => {
    for (const pattern of ["[!a]", "[^a-z]", "[!a-z]x"]) {
      expect(globSyntaxError(pattern), pattern).toBeUndefined();
    }
  });

  test("rejects unopened and unclosed alternates", () => {
    expect(globSyntaxError("a,b}")).toMatch(/unopened alternates/);
    expect(globSyntaxError("{a,b}}")).toMatch(/unopened alternates/);
    expect(globSyntaxError("{a,b")).toMatch(/unclosed alternates/);
    expect(globSyntaxError("{a,{b,c}")).toMatch(/unclosed alternates/);
  });

  test("accepts balanced alternates and braces inside classes", () => {
    for (const pattern of ["{a,b}", "a{b,c}d", "{a,{b,c}}", "[{a,b}]", "{}"]) {
      expect(globSyntaxError(pattern), pattern).toBeUndefined();
    }
    // A brace inside a class is a literal member, but a `}` AFTER the class
    // closes is an unopened alternate in globset too (the class parser consumes
    // only up to its closing `]`).
    expect(globSyntaxError("[{]}")).toMatch(/unopened alternates/);
  });

  test("matches globset parity for mixed constructs", () => {
    // These exercise the interactions the provider's parser handles in one pass:
    // escapes inside alternates, classes inside alternates, commas outside
    // alternates, and braces inside classes.
    for (const pattern of ["{a\\,b,c}", "a,b", "[{a,b}]", "\\{a,b\\}"]) {
      expect(globSyntaxError(pattern), pattern).toBeUndefined();
    }
    // A class with an invalid range is rejected even inside an alternate.
    expect(globSyntaxError("{a,[z-a]}")).toMatch(/invalid character class range/);
    expect(globSyntaxError("{a,[z-a]")).toMatch(
      /unclosed alternates|invalid character class range/,
    );
    // A dash awaiting its range end at the class close is an unclosed class...
    expect(globSyntaxError("[a-")).toMatch(/unclosed character class/);
    // ...while a range completed by a backslash member is invalid (backslash
    // is a literal class member, not an escape, inside a class).
    expect(globSyntaxError("[a-\\")).toMatch(/invalid character class range/);
  });

  test("range ordering agrees with code points for astral characters", () => {
    // U+1F600 (😀) precedes U+20000 (𠀀) by scalar value; UTF-16 code units
    // would disagree, but the checker must match Rust's char ordering.
    expect(globSyntaxError("[😀-𠀀]")).toBeUndefined();
    expect(globSyntaxError("[𠀀-😀]")).toMatch(/invalid character class range/);
  });
});
