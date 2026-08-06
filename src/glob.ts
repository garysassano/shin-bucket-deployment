/**
 * Syntactic glob validation mirroring the Rust provider's `globset` parser.
 *
 * The provider compiles `sourceProcessing.include` / `exclude` patterns with
 * `globset::Glob::new` (see `rust/src/request.rs`) and fails the deployment
 * when a pattern does not parse. This module mirrors that parser's *rejection*
 * rules (globset 0.4.x with default options: backslash escapes enabled,
 * unclosed character classes rejected) so a syntax error fails at synthesis
 * instead of after a 15-minute Lambda invocation.
 *
 * The mirror deliberately rejects exactly the pattern shapes `globset` rejects
 * with those defaults:
 *
 * - dangling escape: a trailing `\` outside a character class
 * - unclosed character class: `[` without a closing `]` (`[]` and `[!]` are
 *   unclosed too, because a first-position `]` is a literal member)
 * - invalid character class range: a range whose end precedes its start
 *   (for example `[z-a]` or `[z--]`)
 * - unclosed alternates: `{` without a matching `}`
 * - unopened alternates: `}` without a matching `{`
 *
 * Accepted patterns are left to the provider's own matcher; this checker makes
 * no claim about match semantics.
 *
 * Note on ordering: comparing characters by code point here matches Rust's
 * `char` ordering, so range validation agrees with globset even for astral
 * characters (where UTF-16 code-unit comparison would disagree).
 */

/** Describes why `pattern` is invalid, or `undefined` when globset accepts it. */
export function globSyntaxError(pattern: string): string | undefined {
  const chars = [...pattern];
  let index = 0;
  let alternates = 0;

  while (index < chars.length) {
    const c = chars[index];
    if (c === undefined) {
      // Unreachable while `index < chars.length`; guards the indexed read
      // without a non-null assertion.
      break;
    }
    if (c === "\\") {
      if (index + 1 >= chars.length) {
        return "dangling escape: the pattern ends with a literal backslash";
      }
      // The escaped character is a literal and consumes no further syntax.
      index += 2;
      continue;
    }
    if (c === "[") {
      const closed = parseCharacterClass(chars, index + 1);
      if (typeof closed === "string") {
        return closed;
      }
      index = closed;
      continue;
    }
    if (c === "{") {
      alternates += 1;
    } else if (c === "}") {
      if (alternates === 0) {
        return "unopened alternates: `}` without a matching `{`";
      }
      alternates -= 1;
    }
    index += 1;
  }

  if (alternates > 0) {
    return "unclosed alternates: `{` without a matching `}`";
  }
  return undefined;
}

/**
 * Parses one character class starting after the opening `[`.
 *
 * Returns the index just past the closing `]`, or an error description.
 * Mirrors globset's `parse_class`: a first-position `]` is a literal member,
 * `!`/`^` negate, `-` is a literal when first or last, and otherwise forms a
 * range whose end must not precede its start.
 */
function parseCharacterClass(chars: string[], start: number): number | string {
  let index = start;
  if (chars[index] === "!" || chars[index] === "^") {
    index += 1;
  }
  let first = true;
  let inRange = false;
  // Start code point of the last pushed member/range; ranges extend it.
  let rangeStart = 0;

  for (;;) {
    const c = chars[index];
    if (c === undefined) {
      return "unclosed character class: `[` without a closing `]`";
    }
    if (c === "]") {
      if (first) {
        // First-position `]` is a literal member; keep scanning.
        first = false;
        index += 1;
        continue;
      }
      return index + 1;
    }
    if (c === "-") {
      if (first) {
        // Literal `-` member.
        first = false;
      } else if (inRange) {
        // Complete the pending range with `-` as its end.
        const dashEnd = codePointOf("-");
        if (dashEnd < rangeStart) {
          return invalidRange(rangeStart, dashEnd);
        }
        inRange = false;
      } else {
        // Start a pending range whose end is the next member.
        inRange = true;
      }
      index += 1;
      continue;
    }
    if (inRange) {
      const end = codePointOf(c);
      if (end < rangeStart) {
        return invalidRange(rangeStart, end);
      }
      inRange = false;
    } else {
      rangeStart = codePointOf(c);
    }
    first = false;
    index += 1;
  }
}

function invalidRange(start: number, end: number): string {
  return `invalid character class range \`${String.fromCodePoint(start)}-${String.fromCodePoint(end)}\`: its end precedes its start`;
}

/**
 * Code point of a single-character string.
 *
 * Elements of `[...pattern]` are single code points (or lone surrogates), so
 * `codePointAt(0)` is always defined; the fallback exists only to satisfy the
 * type system without a non-null assertion and never fires for these inputs.
 */
function codePointOf(character: string): number {
  return character.codePointAt(0) ?? 0;
}
