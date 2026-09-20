import { SemverUseCase } from "../../../data/use-cases/semver/semver-use-case"

export const makeSemverUseCase = (): SemverUseCase => {
  return new SemverUseCase()
}

export const semverUseCase = makeSemverUseCase()
