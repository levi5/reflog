export function stripGitPrefix(text: string): string {
  return text.trim().replace(/^git\s+/i, "")
}
