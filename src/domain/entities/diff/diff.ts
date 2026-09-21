export type DiffLineKind = "add" | "del" | "hunk" | "meta" | "ctx"

export interface DiffPreviewLine {
  index: number
  kind: DiffLineKind
  text: string
  prefix: string
  filePath: string
  oldLine?: number
  newLine?: number
}

export interface DiffHunk {
  header: string
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: string[]
}

export interface ParsedDiff {
  preamble: string[]
  hunks: DiffHunk[]
}

export interface IDiffParserUseCase {
  parse(text: string): ParsedDiff
  buildHunkPatch(preamble: string[], hunk: DiffHunk): string
  buildPartialPatch(preamble: string[], hunk: DiffHunk, selected: Set<number>): string | null
  getLineKind(line: string): DiffLineKind
}
