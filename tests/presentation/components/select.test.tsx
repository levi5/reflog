import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { Select } from "../../../src/presentation/components/Select"
import { renderString } from "../helpers/render"

const OPTIONS = [
  { value: "main", label: "main" },
  { value: "feat", label: "feat/x" },
]

describe("Select accessibility", () => {
  it("exposes the trigger as a collapsed combobox", () => {
    const html = renderToString(<Select label="Branch" value="main" options={OPTIONS} onChange={() => {}} />)
    expect(html).toMatch(/role="combobox"/)
    expect(html).toMatch(/aria-haspopup="listbox"/)
    expect(html).toMatch(/aria-expanded="false"/)
    expect(html).toMatch(/aria-label="Branch"/)
    expect(html).not.toMatch(/role="listbox"/)
  })

  it("marks the current option as selected in the trigger", () => {
    const html = renderString(<Select label="Branch" value="feat" options={OPTIONS} onChange={() => {}} />, {
      lang: "en",
    })
    expect(html).toContain("feat/x")
  })

  it("disables the trigger when there is nothing to pick", () => {
    const html = renderToString(<Select label="Branch" value="" options={[]} onChange={() => {}} />)
    expect(html).toMatch(/<button[^>]*disabled/)
  })

  it("keeps the accessible name even when disabled by prop", () => {
    const html = renderToString(<Select label="Branch" value="main" options={OPTIONS} disabled onChange={() => {}} />)
    expect(html).toMatch(/<button[^>]*aria-label="Branch"[^>]*disabled/)
  })
})
