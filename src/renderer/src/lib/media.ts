/** Build a media:// URL the main process can serve from an absolute local path. */
export function mediaUrl(absPath?: string | null): string {
  if (!absPath) return ''
  // base64url encode (UTF-8 safe) so Windows paths with \ and : survive URL parsing
  const utf8 = new TextEncoder().encode(absPath)
  let bin = ''
  for (const b of utf8) bin += String.fromCharCode(b)
  const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `media://i/${b64}`
}
