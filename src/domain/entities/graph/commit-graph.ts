import type { CommitInfo } from "../../../types"

export interface GraphLink {
  fromLane: number
  toLane: number
}

export interface GraphRow {
  commit: CommitInfo
  lane: number
  top: (string | null)[]
  bottom: (string | null)[]
  links: GraphLink[]
  isMerge: boolean
}

export interface GraphLayout {
  rows: GraphRow[]
  lanes: number
}

export type RefKind = "head" | "branch" | "remote" | "tag"

export interface ParsedRef {
  kind: RefKind
  label: string
}

export interface ICommitGraphUseCase {
  layoutGraph(commits: CommitInfo[]): GraphLayout
  parseRefs(refs: string[]): ParsedRef[]
  laneColor(lane: number): string
}
