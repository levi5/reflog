import { DiffParserUseCase } from "../../../data/use-cases/diff/parser-use-case"

export const makeDiffParserUseCase = (): DiffParserUseCase => {
  return new DiffParserUseCase()
}

export const diffParserUseCase = makeDiffParserUseCase()
