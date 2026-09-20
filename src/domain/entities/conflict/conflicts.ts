export type Choice = "current" | "incoming" | "both" | "neither"

export interface ConflictBlock {
  id: number
  start_line: number
  mid_line?: number | null
  base_start?: number | null
  base_end?: number | null
  end_line: number
  current_label: string
  incoming_label: string
  current: string[]
  base: string[]
  incoming: string[]
  is_diff3: boolean
}

export interface IConflictResolverUseCase {
  parseConflicts(content: string): ConflictBlock[]
  applyChoiceToContent(content: string, block: ConflictBlock, choice: Choice, bothCurrentFirst?: boolean): string
  blockChoices(content: string, blockId: number, choice: Choice): string
}
