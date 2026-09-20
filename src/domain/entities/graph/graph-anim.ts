import type { CommitInfo } from "../../../types"

export type GraphChange =
  | { kind: "commits"; hashes: string[] }
  | { kind: "checkout"; from: string; to: string }
  | { kind: "ref-add"; name: string; hash: string }
  | { kind: "ref-move"; name: string; hash: string }
  | { kind: "ref-del"; name: string }
  | { kind: "spotlight"; hashes: string[] }
  | { kind: "files"; files: string[] }

export interface IGraphAnimUseCase {
  headTarget(commits: CommitInfo[]): string
  headHash(commits: CommitInfo[]): string
  matchHashes(output: string, commits: CommitInfo[]): string[]
  filesFromOutput(verb: string, output: string): string[]
  spotlightForCommand(
    verb: string,
    output: string,
    commits: CommitInfo[],
  ): { changes: GraphChange[]; fresh: string[] } | null
  diffGraphs(oldCommits: CommitInfo[], newCommits: CommitInfo[]): { changes: GraphChange[]; fresh: string[] }
}
