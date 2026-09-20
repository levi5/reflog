import type { CommitInfo } from "../../../types"
import type { GraphChange, IGraphAnimUseCase } from "../../../domain/entities/graph/graph-anim"

const HASH_RE = /\b[0-9a-f]{7,40}\b/g

export class GraphAnimUseCase implements IGraphAnimUseCase {
  private refsOf(c: CommitInfo): string[] {
    return c.refs.filter((r) => !r.startsWith("HEAD"))
  }

  private refMap(commits: CommitInfo[]): Map<string, string> {
    const m = new Map<string, string>()
    for (const c of commits) {
      for (const r of this.refsOf(c)) {
        if (!m.has(r)) m.set(r, c.hash)
      }
    }
    return m
  }

  headTarget(commits: CommitInfo[]): string {
    for (const c of commits) {
      for (const r of c.refs) {
        const m = /^HEAD -> (.+)$/.exec(r)
        if (m) return m[1] ?? ""
      }
    }
    return ""
  }

  headHash(commits: CommitInfo[]): string {
    for (const c of commits) {
      if (c.refs.some((r) => r === "HEAD" || r.startsWith("HEAD ->"))) {
        return c.hash
      }
    }
    return ""
  }

  matchHashes(output: string, commits: CommitInfo[]): string[] {
    const found: string[] = []
    for (const match of output.matchAll(HASH_RE)) {
      const token = match[0]
      const hit = commits.find((c) => c.hash.startsWith(token) || c.short === token)
      if (hit && !found.includes(hit.hash)) found.push(hit.hash)
    }
    return found
  }

  filesFromOutput(verb: string, output: string): string[] {
    const files: string[] = []
    for (const raw of output.split("\n")) {
      const line = raw.trimEnd()
      if (!line.trim()) continue
      if (verb === "status") {
        if (!/^[MADRCUT?! ][MADRCUT?!] /.test(line)) continue
        const rest = line.slice(3)
        const arrow = rest.lastIndexOf(" -> ")
        files.push(arrow >= 0 ? rest.slice(arrow + 4).trim() : rest.trim())
        continue
      }
      const pipe = line.indexOf(" | ")
      if (pipe > 0) files.push(line.slice(0, pipe).trim())
    }
    return files.filter((f) => f !== "")
  }

  spotlightForCommand(
    verb: string,
    output: string,
    commits: CommitInfo[],
  ): { changes: GraphChange[]; fresh: string[] } | null {
    if (verb === "log" || verb === "show") {
      const hashes = this.matchHashes(output, commits)
      if (hashes.length === 0) return null
      return { changes: [{ kind: "spotlight", hashes }], fresh: hashes }
    }
    if (verb === "branch") {
      const branchNames = output
        .split("\n")
        .map((line) => line.replace(/^[*+\s]+/, "").trim())
        .filter(Boolean)
      if (branchNames.length === 0) return null

      const hashes: string[] = []
      for (const branchName of branchNames) {
        const commit = commits.find((c) =>
          c.refs.some((r) => {
            const cleanRef = r.replace(/^HEAD -> /, "").trim()
            return cleanRef === branchName || cleanRef.endsWith(`/${branchName}`)
          }),
        )
        if (commit && !hashes.includes(commit.hash)) {
          hashes.push(commit.hash)
        }
      }

      if (hashes.length === 0) return null
      return { changes: [{ kind: "spotlight", hashes }], fresh: hashes }
    }
    if (verb === "status" || verb === "diff") {
      const files = this.filesFromOutput(verb, output)
      if (files.length === 0) return null
      return { changes: [{ kind: "files", files }], fresh: [] }
    }
    return null
  }

  diffGraphs(oldCommits: CommitInfo[], newCommits: CommitInfo[]): { changes: GraphChange[]; fresh: string[] } {
    const changes: GraphChange[] = []
    const oldHashes = new Set(oldCommits.map((c) => c.hash))
    const fresh = newCommits.filter((c) => !oldHashes.has(c.hash)).map((c) => c.hash)
    if (fresh.length > 0) changes.push({ kind: "commits", hashes: fresh })

    const oldRefs = this.refMap(oldCommits)
    const newRefs = this.refMap(newCommits)
    for (const [name, hash] of newRefs) {
      if (!oldRefs.has(name)) {
        changes.push({ kind: "ref-add", name, hash })
        if (!fresh.includes(hash)) fresh.push(hash)
      } else if (oldRefs.get(name) !== hash) {
        changes.push({ kind: "ref-move", name, hash })
        if (!fresh.includes(hash)) fresh.push(hash)
      }
    }
    for (const name of oldRefs.keys()) {
      if (!newRefs.has(name)) changes.push({ kind: "ref-del", name })
    }

    const from = this.headTarget(oldCommits)
    const to = this.headTarget(newCommits)
    if (from !== to && (from || to)) {
      changes.push({ kind: "checkout", from: from || "?", to: to || "?" })
    }

    return { changes, fresh }
  }
}
