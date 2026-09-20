import type { DiffHunk, DiffLineKind, ParsedDiff } from "../../domain/entities/diff/diff"
import { diffParserUseCase } from "../factories/use-cases/diff-factory"

export const parseDiff = (text: string): ParsedDiff => diffParserUseCase.parse(text)
export const buildHunkPatch = (preamble: string[], hunk: DiffHunk): string =>
  diffParserUseCase.buildHunkPatch(preamble, hunk)
export const lineKind = (line: string): DiffLineKind => diffParserUseCase.getLineKind(line)
