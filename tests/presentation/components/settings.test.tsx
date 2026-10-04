import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { MessageProvider, RepoProvider, SettingsProvider } from "../../../src/presentation/context"
import { TranslationProvider } from "../../../src/presentation/context/translation/translation-context"
import { Settings } from "../../../src/presentation/pages/Settings"

function renderSettings(): string {
  return renderToString(
    <TranslationProvider>
      <SettingsProvider>
        <MessageProvider>
          <RepoProvider>
            <Settings />
          </RepoProvider>
        </MessageProvider>
      </SettingsProvider>
    </TranslationProvider>,
  )
}

describe("Settings layout", () => {
  it("renders git config inside a collapsed accordion above about", () => {
    const html = renderSettings()
    expect(html).toMatch(/aria-expanded="false"/)
    expect(html).toContain("Git configuration")
    const accordionAt = html.indexOf("Git configuration")
    const aboutAt = html.indexOf("About")
    expect(aboutAt).toBeGreaterThan(accordionAt)
  })

  it("keeps identity keys out of the generic git config editor", () => {
    const html = renderSettings()
    expect(html).toContain("hidden here")
    expect(html).not.toContain('aria-label="user.name"')
    expect(html).not.toContain('aria-label="user.email"')
  })
})
