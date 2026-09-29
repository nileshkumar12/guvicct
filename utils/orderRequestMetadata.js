const net = require("node:net");

const getHeader = (req, name) => req.get?.(name) || req.headers?.[name] || "";

const isPublicIp = (ipAddress) => {
  const normalized = String(ipAddress || "").replace(/^::ffff:/i, "");
  const version = net.isIP(normalized);
  if (version === 4) {
    const [first, second] = normalized.split(".").map(Number);
    return !(
      first === 0 || first === 10 || first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) || first >= 224
    );
  }
  if (version === 6) {
    const lower = normalized.toLowerCase();
    return lower !== "::1" && !lower.startsWith("fc") && !lower.startsWith("fd") &&
      !/^fe[89ab]/.test(lower);
  }
  return false;
};

const getClientDetails = (userAgent) => {
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Firefox\//.test(userAgent)
      ? "Firefox"
      : /(?:Chrome|CriOS)\//.test(userAgent)
        ? "Chrome"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : /MSIE|Trident\//.test(userAgent)
            ? "Internet Explorer"
            : "Unknown";
  const operatingSystem = /Android/.test(userAgent)
    ? "Android"
    : /iPhone|iPad|iPod/.test(userAgent)
      ? "iOS"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "Unknown";
  const deviceType = /iPad|Tablet|PlayBook|Silk/.test(userAgent)
    ? "tablet"
    : /Mobi|iPhone|iPod|Android/.test(userAgent)
      ? "mobile"
      : "desktop";
  return { browser, operatingSystem, deviceType };
};

const isTrustedProxy = (req) => {
  const trustProxy = req.app?.get?.("trust proxy fn");
  const remoteAddress = req.socket?.remoteAddress;
  return Boolean(remoteAddress && trustProxy?.(remoteAddress, 0));
};

const resolveApproximateLocation = async (req, ipAddress, trustedProxy) => {
  const location = trustedProxy
    ? {
        city: getHeader(req, "cf-ipcity") || getHeader(req, "x-vercel-ip-city"),
        state: getHeader(req, "cf-region") || getHeader(req, "x-vercel-ip-country-region"),
        country: getHeader(req, "cf-ipcountry") || getHeader(req, "x-vercel-ip-country"),
      }
    : { city: "", state: "", country: "" };

  if (location.city && location.state && location.country) return location;
  if (!isPublicIp(ipAddress) || typeof fetch !== "function") return location;

  const endpoint = process.env.IP_GEOLOCATION_URL || "https://ipapi.co/{ip}/json/";
  const url = endpoint.replace("{ip}", encodeURIComponent(ipAddress));
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    if (!response.ok) return location;
    const result = await response.json();
    return {
      city: location.city || result.city || "",
      state: location.state || result.region || "",
      country: location.country || result.country_name || result.country || "",
    };
  } catch {
    return location;
  }
};

const resolveOrderRequestMetadata = async (req) => {
  const trustedProxy = isTrustedProxy(req);
  const forwardedClientIp = trustedProxy
    ? getHeader(req, "cf-connecting-ip") || getHeader(req, "x-real-ip")
    : "";
  const ipAddress = String(forwardedClientIp || req.ip || req.socket?.remoteAddress || "")
    .split(",")[0]
    .trim();
  const userAgent = getHeader(req, "user-agent");
  const location = await resolveApproximateLocation(req, ipAddress, trustedProxy);

  return {
    ipAddress,
    location,
    ...getClientDetails(userAgent),
    userAgent,
  };
};

module.exports = { resolveOrderRequestMetadata };