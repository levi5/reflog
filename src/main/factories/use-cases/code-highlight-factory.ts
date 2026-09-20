import { CodeHighlightUseCase } from "../../../data/use-cases/code/highlight-use-case"

export const makeCodeHighlightUseCase = (): CodeHighlightUseCase => {
  return new CodeHighlightUseCase()
}

export const codeHighlightUseCase = makeCodeHighlightUseCase()
