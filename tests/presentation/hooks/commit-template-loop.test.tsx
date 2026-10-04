// @vitest-environment jsdom
import { act, render } from "@testing-library/react"
import { useState } from "react"
import { beforeEach, describe, expect, it } from "vitest"

import { CommitConfigProvider } from "../../../src/presentation/context/commit/commit-config-context"
import { TranslationProvider } from "../../../src/presentation/context/translation/translation-context"
import { useCommitTemplate } from "../../../src/presentation/hooks/commit/useCommitTemplate"

const PREFS_KEY = "reflog:v1:commit.prefs"

interface HarnessApi {
  api: ReturnType<typeof useCommitTemplate>
  setValue: (value: string) => void
  renders: () => number
}

function mount(initial: string): HarnessApi {
  let renders = 0
  let setValue: (value: string) => void = () => {}
  let api: ReturnType<typeof useCommitTemplate> | null = null

  function Harness() {
    const [value, update] = useState(initial)
    renders += 1
    setValue = update
    api = useCommitTemplate({
      value,
      onChange: update,
      repoPath: "",
      branch: "feature/PROJ-123-x",
    })
    return null
  }

  render(
    <TranslationProvider>
      <CommitConfigProvider>
        <Harness />
      </CommitConfigProvider>
    </TranslationProvider>,
  )

  return {
    get api() {
      if (!api) throw new Error("hook nao montado")
      return api
    },
    setValue,
    renders: () => renders,
  }
}

const RENDER_LIMIT = 25

describe("commit template: feedback entre formatted e value", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("nao entra em loop quando o template injeta um trailer e o valor vem de fora", () => {
    window.localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ templateId: "builtin:jira", useIcons: false, strict: false }),
    )

    const host = mount("feat: abc\n\nJira: PROJ-123")

    act(() => {
      host.api.setField("type", "feat")
    })

    expect(host.renders()).toBeLessThan(RENDER_LIMIT)
  })

  it("nao cresce a mensagem a cada edicao quando o valor ja traz o trailer do template", () => {
    window.localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ templateId: "builtin:jira", useIcons: false, strict: false }),
    )

    const host = mount("feat: abc\n\nJira: PROJ-123")

    act(() => {
      host.api.setField("scope", "api")
    })
    const first = host.api.formatted

    act(() => {
      host.api.setField("scope", "web")
    })
    const second = host.api.formatted

    act(() => {
      host.api.setField("scope", "api")
    })
    const third = host.api.formatted

    expect(second.length).toBeLessThanOrEqual(first.length + 8)
    expect(third.length).toBeLessThanOrEqual(first.length + 8)
    expect(host.renders()).toBeLessThan(RENDER_LIMIT)
  })

  it("nao entra em loop com BREAKING CHANGE", () => {
    window.localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ templateId: "builtin:conventional", useIcons: false, strict: false }),
    )

    const host = mount("feat!: abc\n\nBREAKING CHANGE")

    act(() => {
      host.api.setField("scope", "api")
    })

    expect(host.renders()).toBeLessThan(RENDER_LIMIT)
    expect(host.api.formatted.match(/BREAKING CHANGE/g)?.length ?? 0).toBeLessThanOrEqual(1)
  })

  it("ainda popula os campos quando o valor muda por fora", () => {
    const host = mount("")

    act(() => {
      host.setValue("fix(api): corrige o parse")
    })

    expect(host.api.fields.type).toBe("fix")
    expect(host.api.fields.scope).toBe("api")
    expect(host.api.fields.subject).toBe("corrige o parse")
  })

  it("ainda propaga o subject digitado para o valor", () => {
    const host = mount("")

    act(() => {
      host.api.setField("subject", "abc")
    })

    expect(host.api.formatted).toBe("abc")
    expect(host.renders()).toBeLessThan(RENDER_LIMIT)
  })
})
