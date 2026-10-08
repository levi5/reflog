import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { TranslationProvider } from "../../../src/presentation/context/translation/translation-context"
import { RebaseForm } from "../../../src/presentation/components/Merge/Rebase/Form"
import type { CommitInfo, RebaseOp } from "../../../src/types"

function commit(hash: string, message: string): CommitInfo {
  return {
    hash,
    message,
    author: "dev",
    date: "2026-01-01",
    parents: [],
    refs: [],
  } as unknown as CommitInfo
}

const first = commit("aaa111", "first")
const second = commit("bbb222", "second")
const third = commit("ccc333", "third")

function renderForm(commits: CommitInfo[], onApply = vi.fn()) {
  const utils = render(
    <TranslationProvider>
      <RebaseForm
        defaultOnto="main"
        commits={commits}
        loading={false}
        error={null}
        busy={false}
        onLoad={vi.fn()}
        onApply={onApply}
      />
    </TranslationProvider>,
  )
  return { ...utils, onApply }
}

async function applyRebase() {
  await userEvent.click(screen.getByRole("button", { name: /apply rebase/i }))
}

describe("RebaseForm preserves the user-chosen plan", () => {
  it("keeps manual order when the commit list is recreated with the same hashes", async () => {
    const { rerender } = renderForm([first, second, third])

    const moveUp = screen.getAllByRole("button", { name: /up|acima|↑/i })
    await userEvent.click(moveUp[moveUp.length - 1])

    const onApply = vi.fn()
    rerender(
      <TranslationProvider>
        <RebaseForm
          defaultOnto="main"
          commits={[first, second, third].map((item) => ({ ...item }))}
          loading={false}
          error={null}
          busy={false}
          onLoad={vi.fn()}
          onApply={onApply}
        />
      </TranslationProvider>,
    )

    await applyRebase()

    const [, ops] = onApply.mock.calls[0]
    expect(ops.map((op: RebaseOp) => op.hash)).toEqual(["ccc333", "aaa111", "bbb222"])
  })

  it("keeps typed onto text when defaultOnto does not change", async () => {
    const onApply = vi.fn()
    const { rerender } = render(
      <TranslationProvider>
        <RebaseForm
          defaultOnto="main"
          commits={[first, second]}
          loading={false}
          error={null}
          busy={false}
          onLoad={vi.fn()}
          onApply={onApply}
        />
      </TranslationProvider>,
    )

    const input = screen.getByLabelText(/rebase onto/i)
    await userEvent.clear(input)
    await userEvent.type(input, "release/2.0")

    rerender(
      <TranslationProvider>
        <RebaseForm
          defaultOnto="main"
          commits={[first, second].map((item) => ({ ...item }))}
          loading={false}
          error={null}
          busy={false}
          onLoad={vi.fn()}
          onApply={onApply}
        />
      </TranslationProvider>,
    )

    expect((input as HTMLInputElement).value).toBe("release/2.0")
  })

  it("reapplies the default when defaultOnto actually changes", async () => {
    const onApply = vi.fn()
    const { rerender } = render(
      <TranslationProvider>
        <RebaseForm
          defaultOnto="main"
          commits={[first, second]}
          loading={false}
          error={null}
          busy={false}
          onLoad={vi.fn()}
          onApply={onApply}
        />
      </TranslationProvider>,
    )

    const input = screen.getByLabelText(/rebase onto/i)
    await userEvent.clear(input)
    await userEvent.type(input, "anything")

    rerender(
      <TranslationProvider>
        <RebaseForm
          defaultOnto="develop"
          commits={[first, second]}
          loading={false}
          error={null}
          busy={false}
          onLoad={vi.fn()}
          onApply={onApply}
        />
      </TranslationProvider>,
    )

    expect((input as HTMLInputElement).value).toBe("develop")
  })
})
