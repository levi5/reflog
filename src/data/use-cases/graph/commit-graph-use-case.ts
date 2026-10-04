import type { CommitInfo } from "../../../types"
import type {
  GraphLayout,
  GraphLink,
  GraphRow,
  ICommitGraphUseCase,
  ParsedRef,
} from "../../../domain/entities/graph/commit-graph"
import { LANE_COLORS } from "../../../shared/constants/commit/commitGraph"

export class CommitGraphUseCase implements ICommitGraphUseCase {
  private trimLanes(lanes: (string | null)[]): (string | null)[] {
    let end = lanes.length
    while (end > 0 && lanes[end - 1] === null) end--
    return lanes.slice(0, end)
  }

  private classifyRefPart(part: string): ParsedRef {
    const name = part.trim()
    if (name === "HEAD") return { kind: "head", label: "HEAD" }
    if (name.startsWith("tag: ")) {
      return { kind: "tag", label: name.slice("tag: ".length) }
    }
    if (name.includes("/")) return { kind: "remote", label: name }
    return { kind: "branch", label: name }
  }

  layoutGraph(commits: CommitInfo[]): GraphLayout {
    const seen = new Set(commits.map((commit) => commit.hash))
    let lanes: (string | null)[] = []
    const rows: GraphRow[] = []
    let maxLanes = 1

    for (const commit of commits) {
      let lane = lanes.indexOf(commit.hash)
      if (lane === -1) {
        lane = lanes.length
        lanes.push(commit.hash)
      }
      const top = this.trimLanes([...lanes])
      const bottom = [...lanes]
      const links: GraphLink[] = []

      const parents = [...new Set(commit.parents)].filter((parentHash) => parentHash !== commit.hash)
      if (parents.length === 0) {
        bottom[lane] = null
      } else {
        const [first, ...rest] = parents
        const existing = bottom.indexOf(first)
        if (existing !== -1 && existing !== lane) {
          bottom[lane] = null
          links.push({ fromLane: lane, toLane: existing })
        } else {
          bottom[lane] = first
          links.push({ fromLane: lane, toLane: lane })
        }
        for (const parentHash of rest) {
          let targetLane = bottom.indexOf(parentHash)
          if (targetLane === -1) {
            targetLane = bottom.indexOf(null)
            if (targetLane === -1) {
              targetLane = bottom.length
              bottom.push(parentHash)
            } else {
              bottom[targetLane] = parentHash
            }
          }
          if (!links.some((link) => link.toLane === targetLane)) {
            links.push({ fromLane: lane, toLane: targetLane })
          }
        }
      }

      for (let slot = 0; slot < bottom.length; slot++) {
        if (bottom[slot] !== null && !seen.has(bottom[slot] as string)) {
          bottom[slot] = null
        }
      }

      const trimmedBottom = this.trimLanes(bottom)
      rows.push({
        commit,
        lane,
        top,
        bottom: trimmedBottom,
        links,
        isMerge: parents.length > 1,
      })
      lanes = trimmedBottom
      maxLanes = Math.max(maxLanes, top.length, trimmedBottom.length)
    }

    return { rows, lanes: Math.max(maxLanes, 1) }
  }

  parseRefs(refs: string[]): ParsedRef[] {
    const out: ParsedRef[] = []
    for (const ref of refs) {
      if (ref.includes("->")) {
        for (const part of ref.split("->")) {
          if (part.trim() !== "") out.push(this.classifyRefPart(part))
        }
      } else if (ref.trim() !== "") {
        out.push(this.classifyRefPart(ref))
      }
    }
    return out
  }

  laneColor(lane: number): string {
    return LANE_COLORS[lane % LANE_COLORS.length] ?? "var(--grape)"
  }
}
