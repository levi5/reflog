import { BLAME_BLOCK_REGEX } from "../../../shared/constants/blame"
import type { BlameLine, IBlameParserUseCase } from "../../../domain/entities/blame/blame"

export class BlameParserUseCase implements IBlameParserUseCase {
  parse(output: string): BlameLine[] {
    const lines: BlameLine[] = []
    let sha = ""
    let author = ""
    let time = 0
    let summary = ""
    let lineno = 0

    for (const raw of output.split("\n")) {
      const block = BLAME_BLOCK_REGEX.exec(raw)
      if (block) {
        sha = block[1] ?? ""
        author = ""
        time = 0
        summary = ""
        continue
      }
      if (raw.startsWith("author ")) {
        author = raw.slice(7).trim()
        continue
      }
      if (raw.startsWith("author-time ")) {
        time = Number.parseInt(raw.slice(12).trim(), 10) || 0
        continue
      }
      if (raw.startsWith("summary ")) {
        summary = raw.slice(8).trim()
        continue
      }
      if (raw.startsWith("\t")) {
        lineno += 1
        const uncommitted = /^0+$/.test(sha)
        lines.push({
          lineno,
          commit: uncommitted ? "—" : sha.slice(0, 7),
          author: uncommitted ? "You" : author || "—",
          date: time > 0 ? new Date(time * 1000).toLocaleDateString() : "",
          summary,
          text: raw.slice(1),
          uncommitted,
        })
      }
    }
    return lines
  }
}
