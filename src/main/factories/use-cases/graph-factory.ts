import { CommitGraphUseCase } from "../../../data/use-cases/graph/commit-graph-use-case"
import { GraphAnimUseCase } from "../../../data/use-cases/graph/graph-anim-use-case"
import { GraphLayoutUseCase } from "../../../data/use-cases/graph/graph-layout-use-case"

export const makeCommitGraphUseCase = (): CommitGraphUseCase => {
  return new CommitGraphUseCase()
}

export const makeGraphAnimUseCase = (): GraphAnimUseCase => {
  return new GraphAnimUseCase()
}

export const makeGraphLayoutUseCase = (): GraphLayoutUseCase => {
  return new GraphLayoutUseCase()
}

export const commitGraphUseCase = makeCommitGraphUseCase()
export const graphAnimUseCase = makeGraphAnimUseCase()
export const graphLayoutUseCase = makeGraphLayoutUseCase()
