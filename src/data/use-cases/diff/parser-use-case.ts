import { HUNK_HEADER_REGEX } from "../../../shared/constants/diff"
import type { DiffHunk, DiffLineKind, IDiffParserUseCase, ParsedDiff } from "../../../domain/entities/diff/diff"

export class DiffParserUseCase implements IDiffParserUseCase {
  parse(text: string): ParsedDiff {
    const preamble: string[] = []
    const hunks: DiffHunk[] = []
    let current: DiffHunk | null = null

    for (const line of text.split("\n")) {
      const match = HUNK_HEADER_REGEX.exec(line)
      if (match) {
        current = {
          header: line,
          oldStart: Number.parseInt(match[1], 10),
          oldLines: match[2] === undefined ? 1 : Number.parseInt(match[2], 10),
          newStart: Number.parseInt(match[3], 10),
          newLines: match[4] === undefined ? 1 : Number.parseInt(match[4], 10),
          lines: [],
        }
        hunks.push(current)
        continue
      }
      if (current) {
        current.lines.push(line)
      } else {
        preamble.push(line)
      }
    }
    return { preamble, hunks }
  }

  buildHunkPatch(preamble: string[], hunk: DiffHunk): string {
    const head = preamble.filter(
      (l) =>
        l.startsWith("diff --git") ||
        l.startsWith("index ") ||
        l.startsWith("--- ") ||
        l.startsWith("+++ ") ||
        l.startsWith("old mode") ||
        l.startsWith("new mode") ||
        l.startsWith("new file") ||
        l.startsWith("deleted file") ||
        l.startsWith("similarity index") ||
        l.startsWith("rename from") ||
        l.startsWith("rename to"),
    )
    return `${[...head, hunk.header, ...hunk.lines].join("\n").replace(/\n$/, "")}\n`
  }

  getLineKind(line: string): DiffLineKind {
    if (line.startsWith("@@")) return "hunk"
    if (
      line.startsWith("diff --git") ||
      line.startsWith("index ") ||
      line.startsWith("--- ") ||
      line.startsWith("+++ ")
    )
      return "meta"
    if (line.startsWith("+")) return "add"
    if (line.startsWith("-")) return "del"
    return "ctx"
  }
}
