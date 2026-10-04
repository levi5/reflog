import { describe, expect, it } from "vitest"

import { Accordion } from "../../../src/presentation/components/Accordion"
import { renderString } from "../helpers/render"

describe("Accordion", () => {
  it("renders closed by default with a collapsed trigger", () => {
    const html = renderString(
      <Accordion title="Git config">
        <p>body</p>
      </Accordion>,
    )
    expect(html).toMatch(/aria-expanded="false"/)
    expect(html).toContain("Git config")
    expect(html).toContain("body")
  })

  it("supports controlled open state", () => {
    const html = renderString(
      <Accordion title="Git config" open>
        <p>body</p>
      </Accordion>,
    )
    expect(html).toMatch(/aria-expanded="true"/)
  })

  it("honours defaultOpen", () => {
    const html = renderString(
      <Accordion title="Git config" defaultOpen>
        <p>body</p>
      </Accordion>,
    )
    expect(html).toMatch(/aria-expanded="true"/)
  })
})
