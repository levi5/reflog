import type { FileStatus } from "../../../../types"

export type SectionId = "conflicts" | "staged" | "changes"

export interface SectionedFiles {
  conflicts: FileStatus[]
  staged: FileStatus[]
  changes: FileStatus[]
}

const hasWorktreeChange = (file: FileStatus): boolean => file.y !== " "

export function groupBySection(files: FileStatus[]): SectionedFiles {
  const sections: SectionedFiles = { conflicts: [], staged: [], changes: [] }
  for (const file of files) {
    if (file.unmerged) {
      sections.conflicts.push(file)
      continue
    }
    if (file.staged) sections.staged.push(file)
    if (hasWorktreeChange(file)) sections.changes.push(file)
  }
  return sections
}
