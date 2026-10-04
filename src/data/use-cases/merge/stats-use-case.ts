import type { ConflictFile } from "../../../types"
import type { IMergeStatsUseCase, MergeStats } from "../../../domain/entities/merge/merge-stats"

export class MergeStatsUseCase implements IMergeStatsUseCase {
  private sum(values: number[]): number {
    return values.reduce((total, next) => total + next, 0)
  }

  mergeStats(conflicts: ConflictFile[], resolved: Record<string, number>): MergeStats {
    const remainingHunks = this.sum(conflicts.map((file) => file.conflicts.length))
    const resolvedHunks = this.sum(Object.values(resolved))
    const totalHunks = remainingHunks + resolvedHunks
    const resolvedFiles = Object.keys(resolved).length

    return {
      totalHunks,
      remainingHunks,
      resolvedHunks,
      totalFiles: conflicts.length + resolvedFiles,
      resolvedFiles,
      progress: totalHunks === 0 ? 100 : Math.round((resolvedHunks / totalHunks) * 100),
    }
  }

  pruneResolved(resolved: Record<string, number>, conflicts: ConflictFile[]): Record<string, number> {
    const active = new Set(conflicts.map((file) => file.path))
    return Object.fromEntries(Object.entries(resolved).filter(([path]) => !active.has(path)))
  }

  matchesQuery(path: string, query: string): boolean {
    const normalized = query.trim().toLowerCase()
    return !normalized || path.toLowerCase().includes(normalized)
  }

  shortVersion(version: string): string {
    return version.replace("git version ", "").trim()
  }

  repoBaseName(root: string): string {
    const parts = root.replace(/\\/g, "/").split("/").filter(Boolean)
    return parts.length === 0 ? root : (parts[parts.length - 1] ?? root)
  }

  sshHost(remote: string): string {
    return remote.match(/@([^:/]+)/)?.[1] ?? remote
  }

  gpgVerified(status: string): boolean {
    return status.trim() === "G"
  }
}
