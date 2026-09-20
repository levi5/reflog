import type { DiffPreviewLine } from "../../../domain/entities/diff/diff"
import { HUNK_HEADER_REGEX } from "../../../shared/constants/diff"

function readFilePath(header: string): string {
  let path = header.slice(4).split("\t")[0]
  if (path.startsWith('"')) {
    try {
      path = JSON.parse(path)
    } catch {
      return ""
    }
  }
  return path === "/dev/null" ? "" : path.replace(/^[ab]\//, "")
}

export function buildDiffPreviewLines(diff: string, fallbackPath = ""): DiffPreviewLine[] {
  if (!diff) return []
  const lines = diff.split(/\r?\n/)
  if (lines[lines.length - 1] === "") lines.pop()
  let oldPath = fallbackPath
  let newPath = fallbackPath
  let oldLine = 0
  let newLine = 0
  let oldRemaining = 0
  let newRemaining = 0

  return lines.map((text, index) => {
    const row: DiffPreviewLine = { index, kind: "meta", text, prefix: "", filePath: "" }
    const hunk = HUNK_HEADER_REGEX.exec(text)
    if (hunk) {
      oldLine = Number(hunk[1])
      newLine = Number(hunk[3])
      oldRemaining = hunk[2] === undefined ? 1 : Number(hunk[2])
      newRemaining = hunk[4] === undefined ? 1 : Number(hunk[4])
      return { ...row, kind: "hunk" }
    }
    if (text.startsWith("diff --")) {
      oldPath = fallbackPath
      newPath = fallbackPath
      oldRemaining = 0
      newRemaining = 0
    }
    if (oldRemaining > 0 || newRemaining > 0) {
      const prefix = text[0]
      if (prefix === "+" || prefix === "-" || prefix === " ") {
        row.kind = prefix === "+" ? "add" : prefix === "-" ? "del" : "ctx"
        row.prefix = prefix
        row.text = text.slice(1)
        row.filePath = prefix === "-" ? oldPath || newPath : newPath || oldPath
        if (prefix !== "+") {
          row.oldLine = oldLine++
          oldRemaining--
        }
        if (prefix !== "-") {
          row.newLine = newLine++
          newRemaining--
        }
        return row
      }
    }
    if (text.startsWith("--- ")) oldPath = readFilePath(text)
    if (text.startsWith("+++ ")) newPath = readFilePath(text)
    return row
  })
}
