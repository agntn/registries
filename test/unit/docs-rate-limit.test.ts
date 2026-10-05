import { rateLimitSubject } from "../../docs/server/utils/client-key.ts";

describe("docs rate limit subject", () => {
  it("should count every address of one IPv6 /64 as one client", () => {
    const subjects = new Set(
      [
        "2001:db8:1:2::1",
        "2001:db8:1:2:dead:beef:0:7",
        "2001:0DB8:0001:0002:ffff:ffff:ffff:ffff",
      ].map(rateLimitSubject),
    );

    expect([...subjects]).toEqual(["2001:db8:1:2::/64"]);
  });

  it("should keep neighbouring /64 prefixes apart", () => {
    expect(rateLimitSubject("2001:db8:1:2::1")).not.toBe(rateLimitSubject("2001:db8:1:3::1"));
  });

  it("should find the /64 behind a compressed prefix", () => {
    expect(rateLimitSubject("2001:db8::7")).toBe(rateLimitSubject("2001:db8:0:0:ffff::1"));
    expect(rateLimitSubject("::1")).toBe("0:0:0:0::/64");
  });

  it("should keep IPv4 clients by their full address, mapped or not", () => {
    expect(rateLimitSubject("203.0.113.7")).toBe("203.0.113.7");
    expect(rateLimitSubject("::ffff:203.0.113.7")).not.toBe(rateLimitSubject("::ffff:203.0.113.8"));
  });

  it("should fall back to the raw header when it is not an address", () => {
    expect(rateLimitSubject("fe80::1%eth0")).toBe("fe80::1%eth0");
    expect(rateLimitSubject("::1]@example.com/#a")).toBe("::1]@example.com/#a");
    expect(rateLimitSubject("unknown")).toBe("unknown");
  });
});
