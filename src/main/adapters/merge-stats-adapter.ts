import type { ConflictFile } from "../../types"
import type { MergeStats } from "../../domain/entities/merge/merge-stats"
import { mergeStatsUseCase } from "../factories/use-cases/merge-stats-factory"

export const mergeStats = (conflicts: ConflictFile[], resolved: Record<string, number>): MergeStats =>
  mergeStatsUseCase.mergeStats(conflicts, resolved)

export const pruneResolved = (resolved: Record<string, number>, conflicts: ConflictFile[]): Record<string, number> =>
  mergeStatsUseCase.pruneResolved(resolved, conflicts)

export const shortVersion = (version: string): string => mergeStatsUseCase.shortVersion(version)

export const sshHost = (url: string): string => mergeStatsUseCase.sshHost(url)

export const gpgVerified = (gpg: string): boolean => mergeStatsUseCase.gpgVerified(gpg)

export const matchesQuery = (text: string, query: string): boolean => mergeStatsUseCase.matchesQuery(text, query)

export const repoBaseName = (path: string): string => mergeStatsUseCase.repoBaseName(path)
