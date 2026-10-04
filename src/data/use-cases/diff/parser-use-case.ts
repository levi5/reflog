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
    return `${[...this.patchHead(preamble), hunk.header, ...hunk.lines].join("\n").replace(/\n$/, "")}\n`
  }

  buildPartialPatch(preamble: string[], hunk: DiffHunk, selected: Set<number>): string | null {
    const body = [...hunk.lines]
    if (body.length > 0 && body[body.length - 1] === "") body.pop()
    const out: string[] = []
    let oldCount = 0
    let newCount = 0
    let keptChanges = 0
    let prevEmitted = false
    body.forEach((line, index) => {
      if (line.startsWith("\\")) {
        if (prevEmitted) {
          out.push(line)
        } else {
          prevEmitted = false
        }
        return
      }
      const isDel = line.startsWith("-")
      const isAdd = line.startsWith("+")
      if ((isDel || isAdd) && !selected.has(index)) {
        if (isDel) {
          out.push(` ${line.slice(1)}`)
          oldCount += 1
          newCount += 1
          prevEmitted = true
        } else {
          prevEmitted = false
        }
        return
      }
      out.push(line)
      prevEmitted = true
      if (isDel) {
        oldCount += 1
        keptChanges += 1
      } else if (isAdd) {
        newCount += 1
        keptChanges += 1
      } else {
        oldCount += 1
        newCount += 1
      }
    })
    if (keptChanges === 0) return null
    const match = HUNK_HEADER_REGEX.exec(hunk.header)
    const oldStart = match ? match[1] : String(hunk.oldStart)
    const newStart = match ? match[3] : String(hunk.newStart)
    const suffix = match ? match[5] : ""
    const header = `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@${suffix}`
    return `${[...this.patchHead(preamble), header, ...out].join("\n").replace(/\n$/, "")}\n`
  }

  private patchHead(preamble: string[]): string[] {
    return preamble.filter(
      (line) =>
        line.startsWith("diff --git") ||
        line.startsWith("index ") ||
        line.startsWith("--- ") ||
        line.startsWith("+++ ") ||
        line.startsWith("old mode") ||
        line.startsWith("new mode") ||
        line.startsWith("new file") ||
        line.startsWith("deleted file") ||
        line.startsWith("similarity index") ||
        line.startsWith("rename from") ||
        line.startsWith("rename to"),
    )
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
