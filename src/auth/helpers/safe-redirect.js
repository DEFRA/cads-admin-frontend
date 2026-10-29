/**
 * Returns a safe, same-site redirect path.
 *
 * Only absolute paths on this site (e.g. "/dashboard") are allowed. Absolute
 * URLs ("https://evil.example") and protocol-relative URLs ("//evil.example")
 * are rejected to prevent open-redirect attacks.
 *
 * @param {unknown} target - The candidate redirect target.
 * @param {string|null} [fallback='/'] - Value returned when target is unsafe.
 * @returns {string|null}
 */
export function getSafeRedirectPath(target, fallback = '/') {
  if (typeof target !== 'string' || target.length === 0) {
    return fallback
  }

  // Must be an absolute path on this site and not protocol-relative.
  if (!target.startsWith('/') || target.startsWith('//')) {
    return fallback
  }

  return target
}
