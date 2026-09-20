export type CodeHighlightLang =
  | "javascript"
  | "typescript"
  | "python"
  | "html"
  | "css"
  | "json"
  | "bash"
  | "go"
  | "rust"
  | "java"

export type CodeHighlightTheme = "default" | "dracula" | "monokai" | "vs" | "github"

export interface CodeHighlightOptions {
  language: CodeHighlightLang
  theme?: CodeHighlightTheme
}

export interface ICodeHighlightUseCase {
  languageForFile(path: string): string | null
  highlightLineHast(text: string, path: string): unknown
}
