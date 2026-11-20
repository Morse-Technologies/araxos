/**
 * Two FNV-1a 32-bit passes with different offsets, as 16 hex chars. The mock's stand-in for the server's SHA-256
 * hash chain (Atlas `audit/chain`), kept synchronous so fixtures and tests stay simple. Not a security primitive.
 */
function fnv32(bytes: Uint8Array, offset: number): string {
  let h = offset >>> 0;
  for (const b of bytes) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h.toString(16).padStart(8, "0");
}

export function fnv64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return fnv32(bytes, 0x811c9dc5) + fnv32(bytes, 0x050c5d1f);
}
