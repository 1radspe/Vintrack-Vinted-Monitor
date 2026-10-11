const MAX_CUSTOM_PROXY_HOST_LENGTH = 253;
const HOSTNAME_PATTERN =
    /^(?=.{1,253}$)(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.(?!-)[a-zA-Z0-9-]{1,63}(?<!-))*$/;

function parseIPv4Octets(host: string): number[] | null {
    const octets = host.split(".");
    if (octets.length !== 4) return null;
    const parts: number[] = [];
    for (const octet of octets) {
        if (!/^\d{1,3}$/.test(octet)) return null;
        const value = Number(octet);
        if (!Number.isInteger(value) || value < 0 || value > 255) return null;
        parts.push(value);
    }
    return parts;
}

function isPrivateOrReservedIPv4(parts: number[]): boolean {
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 10) return true; // RFC1918
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 169 && b === 254) return true; // link-local, includes cloud metadata
    return false;
}

/**
 * Minimum SSRF-oriented host validation for the Custom Proxy feature.
 * This is a static, literal-value check only — it does not resolve
 * hostnames, so it cannot catch DNS-rebinding attacks where a public
 * hostname later resolves to a private address.
 */
export function validateCustomProxyHost(rawHost: string): string | null {
    const host = (rawHost || "").trim().toLowerCase();
    if (!host || host.length > MAX_CUSTOM_PROXY_HOST_LENGTH) return null;
    if (host === "localhost" || host.endsWith(".localhost")) return null;
    if (host.endsWith(".local")) return null;

    if (host.includes(":") && !host.includes(".")) {
        // IPv6 literals are not supported by the Custom Proxy storage format
        // yet: createCustomProxy assembles "host:port[:user:pass]" lines,
        // which cannot be unambiguously parsed back apart when the host
        // itself contains colons. Reject explicitly rather than accepting
        // a host that can never be stored correctly.
        return null;
    }

    if (/^\d+(\.\d+){3}$/.test(host)) {
        // Looks like an attempted dotted-decimal IPv4 address - any number
        // of digits per group, not just 1-3 - so oversized groups like
        // "9999" are still routed into strict octet validation instead of
        // silently falling through to the generic hostname pattern.
        const octets = parseIPv4Octets(host);
        if (!octets) return null;
        if (isPrivateOrReservedIPv4(octets)) return null;
        return host;
    }

    if (!HOSTNAME_PATTERN.test(host)) {
        return null;
    }

    return host;
}

export function validateCustomProxyPort(rawPort: string): number | null {
    const trimmed = (rawPort || "").trim();
    if (!/^\d{1,5}$/.test(trimmed)) return null;
    const port = Number(trimmed);
    if (port < 1 || port > 65535) return null;
    return port;
}

const IPV4_MAPPED_IPV6_PREFIX = "::ffff:";

function isPrivateOrReservedIPv6(hostname: string): boolean {
    const normalized = hostname.replace(/^\[|\]$/g, "");
    if (normalized === "::1" || normalized === "::") return true;
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true; // fe80::/10 link-local (approx)
    if (normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7 unique-local
    if (normalized.startsWith(IPV4_MAPPED_IPV6_PREFIX)) {
        const embedded = normalized.slice(IPV4_MAPPED_IPV6_PREFIX.length);
        const octets = parseIPv4Octets(embedded);
        if (octets && isPrivateOrReservedIPv4(octets)) return true;
    }
    return false;
}

/**
 * Shared SSRF blocklist check for a hostname already extracted from a
 * proxy line (e.g. via URL.hostname, or the host portion of a manually
 * parsed host:port[:user:pass] line). Blocks the same categories as
 * validateCustomProxyHost (localhost/.local suffixes, IPv4 private/
 * reserved ranges) plus the known-private IPv6 ranges (loopback,
 * unspecified, link-local, unique-local) and IPv4-mapped IPv6 addresses
 * whose embedded IPv4 is itself private/reserved. Unlike
 * validateCustomProxyHost, this does not reject IPv6 outright - list-mode
 * proxies may already contain legitimate public IPv6 hosts in URL form.
 */
export function isBlockedProxyHostname(rawHostname: string): boolean {
    const hostname = (rawHostname || "").trim().toLowerCase();
    if (!hostname) return true;
    if (hostname === "localhost" || hostname.endsWith(".localhost"))
        return true;
    if (hostname.endsWith(".local")) return true;
    if (hostname.includes(":")) {
        return isPrivateOrReservedIPv6(hostname);
    }
    const octets = parseIPv4Octets(hostname);
    if (octets) return isPrivateOrReservedIPv4(octets);
    return false;
}
