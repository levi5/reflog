// @vitest-environment jsdom
import { act, render } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it } from "vitest"

import { useStableSlice } from "../../../src/presentation/hooks/useStableSlice"

interface HarnessProps {
  extra: string
  stableAction: () => void
  onRenders: (renders: number, slice: Record<string, unknown>) => void
}

function Harness({ extra, stableAction, onRenders }: HarnessProps) {
  const [unrelated, setUnrelated] = useState(0)
  const slice = useStableSlice({
    label: "valor fixo",
    count: unrelated,
    action: stableAction,
  })
  onRenders(unrelated, slice)
  return (
    <button type="button" onClick={() => setUnrelated((previous) => previous + 1)}>
      {extra}
    </button>
  )
}

describe("useStableSlice", () => {
  it("mantem a identidade quando nenhum campo muda", () => {
    const stableAction = () => {}
    const seen: Record<string, unknown>[] = []
    let renders = 0

    render(
      <Harness
        extra="alvo"
        stableAction={stableAction}
        onRenders={() => {
          renders += 1
        }}
      />,
    )

    const before = seen[0]
    expect(before).toBeUndefined()

    // sem estado que dependa do slice, nao deve haver re-render alem do inicial
    expect(renders).toBe(1)
  })

  it("devolve o mesmo objeto quando so estado alheio muda", () => {
    const stableAction = () => {}
    const identities: unknown[] = []

    const view = render(
      <Harness extra="alvo" stableAction={stableAction} onRenders={(_renders, slice) => identities.push(slice)} />,
    )

    const first = identities.at(-1)
    // forcar um re-render sem mudar os campos do slice
    act(() => {
      view.rerender(
        <Harness extra="alvo" stableAction={stableAction} onRenders={(_renders, slice) => identities.push(slice)} />,
      )
    })

    expect(identities.at(-1)).toBe(first)
  })

  it("devolve um objeto novo quando um campo muda", () => {
    const stableAction = () => {}
    const identities: unknown[] = []
    const view = render(
      <Harness extra="alvo" stableAction={stableAction} onRenders={(_renders, slice) => identities.push(slice)} />,
    )

    const before = identities.at(-1)

    act(() => {
      view.getByRole("button").click()
    })

    const after = identities.at(-1)
    expect(after).not.toBe(before)
    expect((after as { count: number }).count).toBe(1)
  })
})
