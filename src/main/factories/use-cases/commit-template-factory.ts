import { CommitTemplateUseCase } from "../../../data/use-cases/commit/commit-template-use-case"
import { localStorageAdapter } from "../../../infrastructure/storage"

export const makeCommitTemplateUseCase = (): CommitTemplateUseCase => {
  return new CommitTemplateUseCase(localStorageAdapter)
}

export const commitTemplateUseCase = makeCommitTemplateUseCase()
