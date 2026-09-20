export interface BlameLine {
  lineno: number
  commit: string
  author: string
  date: string
  summary: string
  text: string
  uncommitted: boolean
}

export interface IBlameParserUseCase {
  parse(output: string): BlameLine[]
}
