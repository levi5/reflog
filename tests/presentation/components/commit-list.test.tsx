import { describe, expect, it } from "vitest"
import type { CommitInfo } from "../../../src/types"
import { CommitList } from "../../../src/presentation/components/Commit/List"
import { renderString } from "../helpers/render"

const countAmendButtons = (html: string) => html.match(/aria-label="Amend commit"/g) ?? []

const commit = (hash: string, parents: string[] = []): CommitInfo => ({
  hash,
  short: hash.slice(0, 7),
  author: "Dev",
  date: "2026-01-01",
  message: `msg ${hash}`,
  parents,
  refs: [],
})

const commits = [commit("aaa1111", ["bbb2222"]), commit("bbb2222"), commit("ccc3333", ["bbb2222"])]

describe("CommitList", () => {
  it("offers amend only for the HEAD commit", () => {
    const html = renderString(
      <CommitList commits={commits} currentBranchName="main" showGraph={false} headHash="aaa1111" onAmend={() => {}} />,
    )
    expect(countAmendButtons(html)).toHaveLength(1)
  })

  it("offers amend for whichever row matches HEAD", () => {
    const html = renderString(
      <CommitList commits={commits} currentBranchName="main" showGraph={false} headHash="ccc3333" onAmend={() => {}} />,
    )
    expect(countAmendButtons(html)).toHaveLength(1)
  })

  it("hides amend when HEAD is unknown", () => {
    const html = renderString(
      <CommitList commits={commits} currentBranchName="main" showGraph={false} onAmend={() => {}} />,
    )
    expect(countAmendButtons(html)).toHaveLength(0)
  })

  it("never offers amend without a handler", () => {
    const html = renderString(
      <CommitList commits={commits} currentBranchName="main" showGraph={false} headHash="aaa1111" />,
    )
    expect(countAmendButtons(html)).toHaveLength(0)
  })
})
