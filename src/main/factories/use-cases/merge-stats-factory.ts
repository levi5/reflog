import { MergeStatsUseCase } from "../../../data/use-cases/merge/stats-use-case"

export const makeMergeStatsUseCase = (): MergeStatsUseCase => {
  return new MergeStatsUseCase()
}

export const mergeStatsUseCase = makeMergeStatsUseCase()
