import { ConflictResolverUseCase } from "../../../data/use-cases/conflict/conflict-resolver-use-case"

export const makeConflictResolverUseCase = (): ConflictResolverUseCase => {
  return new ConflictResolverUseCase()
}

export const conflictResolverUseCase = makeConflictResolverUseCase()
