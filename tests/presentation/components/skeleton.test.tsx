import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Skeleton } from "../../../src/presentation/components/Skeleton"

describe("Skeleton", () => {
  it("renders the requested number of commit rows as a busy status", () => {
    const html = renderToString(<Skeleton.Commits count={10} label="Loading..." />)
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-label="Loading..."')
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(10)
  })

  it("renders lines without a label when none is given", () => {
    const html = renderToString(<Skeleton.Lines count={3} />)
    expect(html).toContain('role="status"')
    expect(html).not.toContain("aria-label")
  })

  it("renders nothing for a zero count", () => {
    const html = renderToString(<Skeleton.Commits count={0} />)
    expect(html).not.toContain("aria-hidden")
  })
})
