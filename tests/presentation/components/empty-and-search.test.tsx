import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { EmptyState } from "../../../src/presentation/components/Empty/State"
import { HistorySearchPanel } from "../../../src/presentation/components/Graph/HistorySearch"
import { renderString } from "../helpers/render"

describe("EmptyState", () => {
  it("renders the message and the optional hint", () => {
    const html = renderToString(<EmptyState message="Nothing here" hint="Try another search" />)
    expect(html).toContain("Nothing here")
    expect(html).toContain("Try another search")
  })

  it("omits the hint when it is not provided", () => {
    const html = renderToString(<EmptyState message="Nothing here" />)
    expect(html).toContain("Nothing here")
    expect(html).not.toMatch(/<p class="_hint/)
  })

  it("marks the success variant", () => {
    const html = renderToString(<EmptyState message="All good" ok />)
    expect(html).toMatch(/_ok_/)
  })
})

describe("HistorySearchPanel", () => {
  it("starts collapsed and exposes every advanced field when expanded", () => {
    const html = renderString(
      <HistorySearchPanel onSearch={() => {}} onClear={() => {}} active={false} busy={false} resultCount={0} />,
      { lang: "en" },
    )
    expect(html).toMatch(/aria-expanded="false"/)
    expect(html).not.toMatch(/aria-label="Author"/)
  })

  it("shows the result count while a search is active", () => {
    const html = renderString(
      <HistorySearchPanel onSearch={() => {}} onClear={() => {}} active busy={false} resultCount={42} />,
      { lang: "en" },
    )
    expect(html).toContain("42")
  })

  it("never renders a busy search as active without results", () => {
    const html = renderString(
      <HistorySearchPanel onSearch={() => {}} onClear={() => {}} active busy resultCount={0} />,
      { lang: "en" },
    )
    expect(html).toMatch(/aria-expanded="false"/)
  })
})
