import type { CommitInfo } from "../../types"
import type { GraphChange } from "../../domain/entities/graph/graph-anim"
import type { CanvasGraphLayout } from "../../domain/entities/graph/graph-layout"
import type { GraphLayout, ParsedRef } from "../../domain/entities/graph/commit-graph"
import { commitGraphUseCase, graphAnimUseCase, graphLayoutUseCase } from "../factories/use-cases/graph-factory"

export const layoutCommitGraph = (commits: CommitInfo[]): GraphLayout => commitGraphUseCase.layoutGraph(commits)
export const parseRefs = (refs: string[]): ParsedRef[] => commitGraphUseCase.parseRefs(refs)
export const commitLaneColor = (lane: number): string => commitGraphUseCase.laneColor(lane)

export const laneColor = (lane: number): string => graphLayoutUseCase.laneColor(lane)
export const layoutGraph = (commits: CommitInfo[]): CanvasGraphLayout => graphLayoutUseCase.layoutGraph(commits)

export const headTarget = (commits: CommitInfo[]): string => graphAnimUseCase.headTarget(commits)
export const headHash = (commits: CommitInfo[]): string => graphAnimUseCase.headHash(commits)
export const matchHashes = (output: string, commits: CommitInfo[]): string[] =>
  graphAnimUseCase.matchHashes(output, commits)
export const filesFromOutput = (verb: string, output: string): string[] =>
  graphAnimUseCase.filesFromOutput(verb, output)
export const spotlightForCommand = (
  verb: string,
  output: string,
  commits: CommitInfo[],
): { changes: GraphChange[]; fresh: string[] } | null => graphAnimUseCase.spotlightForCommand(verb, output, commits)
export const diffGraphs = (
  oldCommits: CommitInfo[],
  newCommits: CommitInfo[],
): { changes: GraphChange[]; fresh: string[] } => graphAnimUseCase.diffGraphs(oldCommits, newCommits)
