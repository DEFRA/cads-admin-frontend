export function hasPermission(perms, key) {
  if (!perms || !key) {
    return false
  }
  return perms.includes(key)
}
