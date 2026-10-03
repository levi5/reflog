import { describe, expect, it } from "vitest"
import type { DiffHunk } from "../../../domain/entities/diff/diff"
import { DiffParserUseCase } from "./parser-use-case"

const useCase = new DiffParserUseCase()

const PREAMBLE = [
  "diff --git a/file.txt b/file.txt",
  "index 1111111..2222222 100644",
  "--- a/file.txt",
  "+++ b/file.txt",
]

function makeHunk(header: string, lines: string[]): DiffHunk {
  return { header, oldStart: 1, oldLines: 4, newStart: 1, newLines: 4, lines }
}

describe("buildPartialPatch", () => {
  it("keeps only selected lines and recounts the header", () => {
    const hunk = makeHunk("@@ -1,4 +1,4 @@", [" ctx1", "-old1", "-old2", "+new1", "+new2", " ctx2"])
    const patch = useCase.buildPartialPatch(PREAMBLE, hunk, new Set([1, 3]))
    expect(patch).toContain("@@ -1,4 +1,4 @@")
    expect(patch).toContain("-old1")
    expect(patch).toContain("+new1")
    expect(patch).toContain(" old2")
    expect(patch).not.toContain("+new2")
  })

  it("returns null when no +/- line is selected", () => {
    const hunk = makeHunk("@@ -1,3 +1,3 @@", [" ctx", "-old", "+new"])
    expect(useCase.buildPartialPatch(PREAMBLE, hunk, new Set())).toBeNull()
    expect(useCase.buildPartialPatch(PREAMBLE, hunk, new Set([0]))).toBeNull()
  })

  it("handles new files (old count zero)", () => {
    const hunk = makeHunk("@@ -0,0 +1,2 @@", ["+line1", "+line2"])
    const patch = useCase.buildPartialPatch(PREAMBLE, hunk, new Set([0]))
    expect(patch).toContain("@@ -0,0 +1,1 @@")
    expect(patch).toContain("+line1")
    expect(patch).not.toContain("+line2")
  })

  it("keeps the hunk header suffix", () => {
    const hunk = makeHunk("@@ -10,2 +10,2 @@ func()", ["-a", "+b"])
    const patch = useCase.buildPartialPatch(PREAMBLE, hunk, new Set([0, 1]))
    expect(patch).toContain("@@ -10,1 +10,1 @@ func()")
  })
})
