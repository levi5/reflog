import { BlameParserUseCase } from "../../../data/use-cases/blame/blame-parser-use-case"

export const makeBlameParserUseCase = (): BlameParserUseCase => {
  return new BlameParserUseCase()
}

export const blameParserUseCase = makeBlameParserUseCase()
