import { describe, expect, it } from "vitest"
import { Pagination } from "../../../src/presentation/components/Pagination"
import { renderString } from "../helpers/render"

describe("Pagination with incremental loading", () => {
  it("disables the last-page button while more commits can be loaded", () => {
    const html = renderString(
      <Pagination currentPage={29} totalItems={300} pageSize={10} hasMore={true} onPageChange={() => {}} />,
    )
    expect(html).toMatch(/<button[^>]*disabled[^>]*aria-label="Last page"/)
    expect(html).not.toContain(">31<")
  })

  it("enables the last-page button while loading when the total is known", () => {
    const html = renderString(
      <Pagination
        currentPage={0}
        totalItems={1080}
        pageSize={10}
        hasMore={true}
        totalKnown={true}
        onPageChange={() => {}}
      />,
    )
    expect(html).toContain(">108<")
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*aria-label="Last page"/)
  })

  it("shows a steady loading state while seeking an unloaded page", () => {
    const html = renderString(
      <Pagination
        currentPage={107}
        totalItems={1080}
        pageSize={10}
        hasMore={true}
        totalKnown={true}
        loading={true}
        onPageChange={() => {}}
      />,
    )
    expect(html).toContain(">108<")
    expect(html).toContain("spinner")
  })

  it("enables the last-page button once everything is loaded", () => {
    const html = renderString(
      <Pagination currentPage={0} totalItems={1080} pageSize={10} hasMore={false} onPageChange={() => {}} />,
    )
    expect(html).toContain(">108<")
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*aria-label="Last page"/)
  })
})
