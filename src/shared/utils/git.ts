export function stripGitPrefix(text: string): string {
  const trimmed = text.trim()
  if (/^git$/i.test(trimmed)) return ""
  return trimmed.replace(/^git\s+/i, "")
}
