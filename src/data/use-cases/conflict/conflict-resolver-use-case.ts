import {
  BASE_MARK,
  CURRENT_MARK,
  END_MARK,
  HEAD_STOPS,
  SEP_MARK,
  TAIL_STOPS,
} from "../../../shared/constants/conflicts"
import type { Choice, ConflictBlock, IConflictResolverUseCase } from "../../../domain/entities/conflict/conflicts"

interface ScanResult {
  taken: string[]
  index: number
}

interface ParsedBlockResult {
  block: ConflictBlock | null
  next: number
}

const stripCr = (line: string): string => line.replace(/\r$/, "")

export class ConflictResolverUseCase implements IConflictResolverUseCase {
  private takeUntil(lines: string[], from: number, stops: string[]): ScanResult {
    const taken: string[] = []
    let cursor = from
    while (cursor < lines.length && !stops.some((stop) => (lines[cursor] ?? "").startsWith(stop))) {
      taken.push(lines[cursor] ?? "")
      cursor++
    }
    return { taken, index: cursor }
  }

  private parseAt(lines: string[], start: number, id: number): ParsedBlockResult {
    const head = this.takeUntil(lines, start + 1, HEAD_STOPS)
    const baseStop = lines[head.index] ?? ""
    const hasBase = baseStop.startsWith(BASE_MARK)
    const base = hasBase ? this.takeUntil(lines, head.index + 1, TAIL_STOPS) : { taken: [], index: head.index }

    const sepLine = lines[base.index] ?? ""
    if (!sepLine.startsWith(SEP_MARK)) {
      return { block: null, next: base.index + 1 }
    }

    const tail = this.takeUntil(lines, base.index + 1, [END_MARK])
    const endLine = lines[tail.index] ?? ""
    if (!endLine.startsWith(END_MARK)) {
      return { block: null, next: tail.index + 1 }
    }

    return {
      block: {
        id,
        start_line: start + 1,
        mid_line: base.index + 1,
        base_start: hasBase ? head.index + 1 : null,
        base_end: hasBase ? base.index : null,
        end_line: tail.index + 1,
        current_label: stripCr(lines[start] ?? "").slice(CURRENT_MARK.length),
        incoming_label: stripCr(endLine).length > 8 ? stripCr(endLine).slice(8) : "",
        current: head.taken,
        base: base.taken,
        incoming: tail.taken,
        is_diff3: hasBase,
      },
      next: tail.index + 1,
    }
  }

  parseConflicts(content: string): ConflictBlock[] {
    const lines = content.split("\n")
    const blocks: ConflictBlock[] = []
    let blockIndex = 0
    let blockId = 0

    while (blockIndex < lines.length) {
      if (!stripCr(lines[blockIndex] ?? "").startsWith(CURRENT_MARK)) {
        blockIndex++
        continue
      }
      const parsed = this.parseAt(lines, blockIndex, blockId)
      if (parsed.block !== null) {
        blocks.push(parsed.block)
        blockId++
      }
      blockIndex = parsed.next
    }
    return blocks
  }

  applyChoiceToContent(content: string, block: ConflictBlock, choice: Choice, bothCurrentFirst = true): string {
    const bothFirst = bothCurrentFirst ? [...block.current, ...block.incoming] : [...block.incoming, ...block.current]

    const replacements: Record<Choice, string[]> = {
      current: block.current,
      incoming: block.incoming,
      both: bothFirst,
      neither: [],
    }

    const lines = content.split("\n")
    return [...lines.slice(0, block.start_line - 1), ...replacements[choice], ...lines.slice(block.end_line)].join("\n")
  }

  blockChoices(content: string, blockId: number, choice: Choice): string {
    const block = this.parseConflicts(content).find((candidate) => candidate.id === blockId)
    if (!block) return content
    return this.applyChoiceToContent(content, block, choice, true)
  }
}
