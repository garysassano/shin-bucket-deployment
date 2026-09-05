// Synthetic keys that are safe to delete through DeleteObjects XML. Literal
// XML-incompatible controls remain covered by the provider's replay tests.
export const LISTING_EDGE_KEYS = [
  "carriage\rreturn.txt",
  "carriage\nreturn.txt",
  "literal%2Fsegment.txt",
  "literal/segment.txt",
  "plus+sign.txt",
  "plus sign.txt",
  "日本語.txt",
  "xml&<>\"'.txt",
] as const;

export const LISTING_EXCLUDED_KEY = "excluded/listing+%\r.js";

export function listingKeyBody(key: string): string {
  return `synthetic-listing-key=${JSON.stringify(key)}\n`;
}
