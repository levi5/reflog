import type { ConflictFile } from "../../../types"

export interface MergeStats {
  totalHunks: number
  remainingHunks: number
  resolvedHunks: number
  totalFiles: number
  resolvedFiles: number
  progress: number
}

export interface IMergeStatsUseCase {
  mergeStats(conflicts: ConflictFile[], resolved: Record<string, number>): MergeStats
  pruneResolved(resolved: Record<string, number>, conflicts: ConflictFile[]): Record<string, number>
  matchesQuery(path: string, query: string): boolean
  shortVersion(version: string): string
  repoBaseName(root: string): string
  sshHost(remote: string): string
  gpgVerified(status: string): boolean
}
