const LINE_KEY_LENGTH = 32

export const LARGE_DIFF_PAGE_LINES = 1000

export function stableKey(content: string, prefix: string, index: number): string {
  return `${prefix}-${content.slice(0, LINE_KEY_LENGTH)}-${index}`
}

export function countLines(content: string): number {
  if (!content) return 0
  let count = 1
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === "\n") count += 1
  }
  return count
}

export function takeLines(content: string, count: number): string {
  let end = 0
  let lines = 0
  while (end < content.length && lines < count) {
    if (content[end] === "\n") lines += 1
    end += 1
  }
  return content.slice(0, end)
}

export function isSelectableLine(diffLine: string): boolean {
  return diffLine.startsWith("+") || diffLine.startsWith("-")
}

export function selectedLinesOf(selectedKeys: Set<string>, hunkIndex: number): Set<number> {
  const selectedLines = new Set<number>()
  selectedKeys.forEach((key) => {
    const separator = key.indexOf(":")
    if (Number(key.slice(0, separator)) === hunkIndex) selectedLines.add(Number(key.slice(separator + 1)))
  })
  return selectedLines
}
