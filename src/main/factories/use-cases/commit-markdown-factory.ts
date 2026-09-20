import { CommitMarkdownUseCase } from "../../../data/use-cases/commit/commit-markdown-use-case"

export const makeCommitMarkdownUseCase = (): CommitMarkdownUseCase => {
  return new CommitMarkdownUseCase()
}

export const commitMarkdownUseCase = makeCommitMarkdownUseCase()
