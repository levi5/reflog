import type { Choice, ConflictBlock } from "../../domain/entities/conflict/conflicts"
import { conflictResolverUseCase } from "../factories/use-cases/conflict-factory"

export const parseConflicts = (content: string): ConflictBlock[] => conflictResolverUseCase.parseConflicts(content)

export const applyChoiceToContent = (
  content: string,
  block: ConflictBlock,
  choice: Choice,
  bothCurrentFirst = true,
): string => conflictResolverUseCase.applyChoiceToContent(content, block, choice, bothCurrentFirst)

export const blockChoices = (content: string, blockId: number, choice: Choice): string =>
  conflictResolverUseCase.blockChoices(content, blockId, choice)
