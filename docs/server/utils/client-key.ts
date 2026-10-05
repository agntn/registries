/** `::ffff:1.2.3.4` after the URL parser: one IPv4 client, not a /64 shared by all of them. */
const IPV4_MAPPED = /^::ffff:[\da-f]{1,4}:[\da-f]{1,4}$/;

/** The eight groups of a canonical IPv6 address, `::` filled with zeros. */
function ipv6Groups(host: string): string[] {
  const [head = "", tail] = host.split("::");
  const left = head === "" ? [] : head.split(":");
  if (tail === undefined) return left;
  const right = tail === "" ? [] : tail.split(":");
  return [...left, ...Array<string>(8 - left.length - right.length).fill("0"), ...right];
}

/** An IPv6 address as the URL parser spells it, or undefined for anything else. */
function canonicalIPv6(address: string): string | undefined {
  try {
    const { hostname } = new URL(`http://[${address}]/`);
    return hostname.startsWith("[") ? hostname.slice(1, -1) : undefined;
  } catch {
    return undefined;
  }
}

/** IPv4 counts by address, IPv6 by its /64: one routed prefix hands out 2^64 fresh addresses. */
export function rateLimitSubject(address: string): string {
  const host = address.includes(":") ? canonicalIPv6(address) : undefined;
  if (host === undefined) return address;
  if (IPV4_MAPPED.test(host)) return host;
  return `${ipv6Groups(host).slice(0, 4).join(":")}::/64`;
}
