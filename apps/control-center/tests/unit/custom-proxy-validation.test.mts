import test from "node:test";
import assert from "node:assert/strict";
import {
    isBlockedProxyHostname,
    validateCustomProxyHost,
    validateCustomProxyPort,
} from "../../src/lib/custom-proxy-validation.ts";

// NOTE: validateCustomProxyHost performs only static, literal-value checks.
// It never resolves DNS, so it cannot detect DNS-rebinding attacks where a
// hostname that looks public resolves to a private/internal address at
// connect time. These tests exercise the static checks only.

test("validateCustomProxyHost: accepts a valid public hostname", () => {
    assert.equal(
        validateCustomProxyHost("proxy.example.com"),
        "proxy.example.com",
    );
});

test("validateCustomProxyHost: normalizes case", () => {
    assert.equal(
        validateCustomProxyHost("PROXY.EXAMPLE.COM"),
        "proxy.example.com",
    );
});

test("validateCustomProxyHost: trims surrounding whitespace", () => {
    assert.equal(
        validateCustomProxyHost("  proxy.example.com  "),
        "proxy.example.com",
    );
});

test("validateCustomProxyHost: accepts a valid public IPv4 address", () => {
    assert.equal(validateCustomProxyHost("8.8.8.8"), "8.8.8.8");
});

test("validateCustomProxyHost: rejects empty input", () => {
    assert.equal(validateCustomProxyHost(""), null);
});

test("validateCustomProxyHost: rejects whitespace-only input", () => {
    assert.equal(validateCustomProxyHost("   "), null);
});

test("validateCustomProxyHost: rejects a host longer than 253 characters", () => {
    const overlong = "a".repeat(254);
    assert.equal(validateCustomProxyHost(overlong), null);
});

test("validateCustomProxyHost: rejects a label longer than 63 characters", () => {
    const longLabel = "a".repeat(64) + ".com";
    assert.equal(validateCustomProxyHost(longLabel), null);
});

test("validateCustomProxyHost: rejects a label starting with a hyphen", () => {
    assert.equal(validateCustomProxyHost("-badstart.com"), null);
});

test("validateCustomProxyHost: rejects a label ending with a hyphen", () => {
    assert.equal(validateCustomProxyHost("bad-.com"), null);
});

test("validateCustomProxyHost: rejects a label with an underscore", () => {
    assert.equal(validateCustomProxyHost("bad_host.com"), null);
});

test("validateCustomProxyHost: rejects a host with an empty label (double dot)", () => {
    assert.equal(validateCustomProxyHost("host..com"), null);
});

test("validateCustomProxyHost: blocks the literal hostname localhost", () => {
    assert.equal(validateCustomProxyHost("localhost"), null);
});

test("validateCustomProxyHost: blocks localhost regardless of case", () => {
    assert.equal(validateCustomProxyHost("LOCALHOST"), null);
});

test("validateCustomProxyHost: blocks dot-localhost suffixes", () => {
    assert.equal(validateCustomProxyHost("foo.localhost"), null);
});

test("validateCustomProxyHost: blocks dot-local suffixes", () => {
    assert.equal(validateCustomProxyHost("myhost.local"), null);
});

test("validateCustomProxyHost: current behavior allows bare local host", () => {
    assert.equal(validateCustomProxyHost("local"), "local");
});

test("validateCustomProxyHost: blocks IPv4 loopback 127.0.0.1", () => {
    assert.equal(validateCustomProxyHost("127.0.0.1"), null);
});

test("validateCustomProxyHost: blocks any 127 loopback address", () => {
    assert.equal(validateCustomProxyHost("127.1.2.3"), null);
});

test("validateCustomProxyHost: blocks RFC1918 private IPv4 ten range", () => {
    assert.equal(validateCustomProxyHost("10.0.0.1"), null);
});

test("validateCustomProxyHost: blocks RFC1918 private IPv4 192168 range", () => {
    assert.equal(validateCustomProxyHost("192.168.1.1"), null);
});

test("validateCustomProxyHost: blocks link local cloud metadata IPv4", () => {
    assert.equal(validateCustomProxyHost("169.254.169.254"), null);
});

test("validateCustomProxyHost: 172 15 is just below the blocked range and accepted", () => {
    assert.equal(validateCustomProxyHost("172.15.255.255"), "172.15.255.255");
});

test("validateCustomProxyHost: 172 16 is the lower boundary of the blocked range", () => {
    assert.equal(validateCustomProxyHost("172.16.0.1"), null);
});

test("validateCustomProxyHost: 172 31 is the upper boundary of the blocked range", () => {
    assert.equal(validateCustomProxyHost("172.31.255.255"), null);
});

test("validateCustomProxyHost: 172 32 is just above the blocked range and accepted", () => {
    assert.equal(validateCustomProxyHost("172.32.0.1"), "172.32.0.1");
});

test("validateCustomProxyHost: rejects malformed numeric address with out of range octets", () => {
    assert.equal(validateCustomProxyHost("999.999.999.999"), null);
});

test("validateCustomProxyHost: rejects an oversized numeric component (9999.1.1.1)", () => {
    assert.equal(validateCustomProxyHost("9999.1.1.1"), null);
});

test("validateCustomProxyHost: blocks IPv6 loopback", () => {
    assert.equal(validateCustomProxyHost("::1"), null);
});

test("validateCustomProxyHost: blocks IPv6 unspecified address", () => {
    assert.equal(validateCustomProxyHost("::"), null);
});

test("validateCustomProxyHost: blocks IPv6 link local", () => {
    assert.equal(validateCustomProxyHost("fe80::1"), null);
});

test("validateCustomProxyHost: blocks IPv6 unique local fc", () => {
    assert.equal(validateCustomProxyHost("fc00::1"), null);
});

test("validateCustomProxyHost: blocks IPv6 unique local fd", () => {
    assert.equal(validateCustomProxyHost("fd12::1"), null);
});

test("validateCustomProxyHost: rejects syntactically invalid IPv6 shaped input", () => {
    assert.equal(validateCustomProxyHost("not:a:valid:ipv6:host"), null);
});

test("validateCustomProxyHost: rejects IPv4 mapped IPv6 loopback", () => {
    assert.equal(validateCustomProxyHost("::ffff:127.0.0.1"), null);
});

test("validateCustomProxyPort: accepts the lower boundary port", () => {
    assert.equal(validateCustomProxyPort("1"), 1);
});

test("validateCustomProxyPort: accepts the upper boundary port", () => {
    assert.equal(validateCustomProxyPort("65535"), 65535);
});

test("validateCustomProxyPort: accepts a typical port", () => {
    assert.equal(validateCustomProxyPort("8080"), 8080);
});

test("validateCustomProxyPort: rejects port zero", () => {
    assert.equal(validateCustomProxyPort("0"), null);
});

test("validateCustomProxyPort: rejects a port above the maximum", () => {
    assert.equal(validateCustomProxyPort("65536"), null);
});

test("validateCustomProxyPort: rejects empty input", () => {
    assert.equal(validateCustomProxyPort(""), null);
});

test("validateCustomProxyPort: rejects a non numeric string", () => {
    assert.equal(validateCustomProxyPort("abc"), null);
});

test("validateCustomProxyPort: rejects a decimal value", () => {
    assert.equal(validateCustomProxyPort("80.5"), null);
});

test("validateCustomProxyPort: rejects a negative sign", () => {
    assert.equal(validateCustomProxyPort("-1"), null);
});

test("validateCustomProxyPort: rejects a positive sign", () => {
    assert.equal(validateCustomProxyPort("+80"), null);
});

test("validateCustomProxyPort: rejects excessively long numeric input", () => {
    assert.equal(validateCustomProxyPort("123456"), null);
    assert.equal(validateCustomProxyPort("99999999999999999999"), null);
});

test("isBlockedProxyHostname: blocks IPv4 loopback", () => {
    assert.equal(isBlockedProxyHostname("127.0.0.1"), true);
});

test("isBlockedProxyHostname: blocks RFC1918 private IPv4", () => {
    assert.equal(isBlockedProxyHostname("10.0.0.5"), true);
});

test("isBlockedProxyHostname: blocks link-local/cloud-metadata IPv4", () => {
    assert.equal(isBlockedProxyHostname("169.254.169.254"), true);
});

test("isBlockedProxyHostname: blocks IPv6 loopback", () => {
    assert.equal(isBlockedProxyHostname("::1"), true);
});

test("isBlockedProxyHostname: blocks bracketed IPv6 loopback", () => {
    assert.equal(isBlockedProxyHostname("[::1]"), true);
});

test("isBlockedProxyHostname: blocks IPv6 unique-local", () => {
    assert.equal(isBlockedProxyHostname("fd12::1"), true);
});

test("isBlockedProxyHostname: blocks IPv6 link-local", () => {
    assert.equal(isBlockedProxyHostname("fe80::1"), true);
});

test("isBlockedProxyHostname: blocks IPv4-mapped IPv6 whose embedded IPv4 is private", () => {
    assert.equal(isBlockedProxyHostname("::ffff:127.0.0.1"), true);
});

test("isBlockedProxyHostname: blocks localhost and .local suffixes", () => {
    assert.equal(isBlockedProxyHostname("localhost"), true);
    assert.equal(isBlockedProxyHostname("foo.local"), true);
});

test("isBlockedProxyHostname: does not block a valid public IPv4 address", () => {
    assert.equal(isBlockedProxyHostname("8.8.8.8"), false);
});

test("isBlockedProxyHostname: does not block a valid public hostname", () => {
    assert.equal(isBlockedProxyHostname("proxy.example.com"), false);
});

test("isBlockedProxyHostname: does not block a valid public IPv6 address", () => {
    assert.equal(isBlockedProxyHostname("2001:4860:4860::8888"), false);
});

test("isBlockedProxyHostname: does not block an IPv4-mapped IPv6 address whose embedded IPv4 is public", () => {
    assert.equal(isBlockedProxyHostname("::ffff:8.8.8.8"), false);
});
