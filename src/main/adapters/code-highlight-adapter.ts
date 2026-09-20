import { codeHighlightUseCase } from "../factories/use-cases/code-highlight-factory"

export const languageForFile = (path: string): string | null => codeHighlightUseCase.languageForFile(path)
export const highlightLineHast = (text: string, path: string) => codeHighlightUseCase.highlightLineHast(text, path)
