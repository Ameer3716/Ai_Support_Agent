const dns = require('dns').promises;
const net = require('net');

/**
 * Blocks server-side request forgery (SSRF) through the "add a URL" knowledge-base
 * feature. Both the automation API (/api/ingest/:clientKey/url) and the admin
 * dashboard let a client provide an arbitrary URL that THIS server fetches. Without
 * this check, that URL could point at internal infrastructure — localhost, a
 * private-network service, or a cloud metadata endpoint (e.g. 169.254.169.254) —
 * and use the server as a proxy to probe or attack it. Every hostname is resolved
 * and checked before fetching; callers are also expected to re-check on every
 * redirect hop, so a public URL can't 302 its way to a private one.
 */
function isPrivateOrReservedIp(ip) {
  const type = net.isIP(ip);
  if (type === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 0) return true; // "this network"
    return false;
  }
  if (type === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1') return true; // loopback
    if (lower.startsWith('fe80:')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    if (lower.startsWith('::ffff:')) return isPrivateOrReservedIp(lower.replace('::ffff:', ''));
    return false;
  }
  return true; // couldn't classify — treat as unsafe
}

function badUrlError(message) {
  const err = new Error(message);
  err.status = 400; // client input problem, not a server fault — surface the real message
  return err;
}

async function assertPublicHttpUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw badUrlError('Invalid URL.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw badUrlError('Only http/https URLs are allowed.');
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  if (hostname === 'localhost') throw badUrlError('Cannot fetch localhost URLs.');

  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw badUrlError(`Could not resolve host: ${hostname}`);
  }
  if (addresses.some((a) => isPrivateOrReservedIp(a.address))) {
    throw badUrlError('This URL resolves to a private or internal address and cannot be fetched.');
  }
  return parsed;
}

module.exports = { assertPublicHttpUrl, isPrivateOrReservedIp };
