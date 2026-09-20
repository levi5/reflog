export type NextVersionsType = {
  base: string
  patch: string
  minor: string
  major: string
}

export interface ISemverUseCase {
  suggestNextVersions(tags: string[]): NextVersionsType | null
}
