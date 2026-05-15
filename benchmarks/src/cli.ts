export function parseCliOptions(
  args: string[],
  allowedOptions: readonly string[],
  usage: () => never,
): Map<string, string> {
  const values = new Map<string, string>();
  const allowed = new Set(allowedOptions);
  const normalizedArgs = args.filter((arg) => arg !== "--");

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const key = normalizedArgs[index];
    if (!key?.startsWith("--")) {
      usage();
    }

    const inlineIndex = key.indexOf("=");
    if (inlineIndex !== -1) {
      const name = key.slice(2, inlineIndex);
      assertOption(name, allowed, usage);
      values.set(name, key.slice(inlineIndex + 1));
      continue;
    }

    const value = normalizedArgs[index + 1];
    if (value === undefined || value.startsWith("--")) {
      usage();
    }
    const name = key.slice(2);
    assertOption(name, allowed, usage);
    values.set(name, value);
    index += 1;
  }

  return values;
}

function assertOption(name: string, allowed: ReadonlySet<string>, usage: () => never): void {
  if (!allowed.has(name)) {
    usage();
  }
}
