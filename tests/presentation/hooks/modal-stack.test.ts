import { describe, expect, it } from "vitest"

import { isTopModal, modalStackDepth, pushModal } from "../../../src/presentation/hooks/ui/useModalStack"

describe("modal stack", () => {
  it("tracks nested overlays and releases them in order", () => {
    expect(modalStackDepth()).toBe(0)

    const releaseOuter = pushModal(Symbol("outer"))
    expect(modalStackDepth()).toBe(1)

    const releaseInner = pushModal(Symbol("inner"))
    expect(modalStackDepth()).toBe(2)

    releaseInner()
    expect(modalStackDepth()).toBe(1)

    releaseOuter()
    expect(modalStackDepth()).toBe(0)
  })

  it("only the topmost overlay handles Escape", () => {
    const outer = Symbol("outer")
    const inner = Symbol("inner")
    const releaseOuter = pushModal(outer)
    const releaseInner = pushModal(inner)

    expect(isTopModal(inner)).toBe(true)
    expect(isTopModal(outer)).toBe(false)

    releaseInner()
    expect(isTopModal(outer)).toBe(true)

    releaseOuter()
  })

  it("releasing twice does not corrupt the stack", () => {
    const a = Symbol("a")
    const b = Symbol("b")
    const releaseA = pushModal(a)
    const releaseB = pushModal(b)

    releaseB()
    releaseB()
    expect(modalStackDepth()).toBe(1)
    expect(isTopModal(a)).toBe(true)

    releaseA()
    expect(modalStackDepth()).toBe(0)
  })

  it("removing a lower entry keeps the upper one on top", () => {
    const lower = Symbol("lower")
    const upper = Symbol("upper")
    const releaseLower = pushModal(lower)
    const releaseUpper = pushModal(upper)

    releaseLower()
    expect(modalStackDepth()).toBe(1)
    expect(isTopModal(upper)).toBe(true)

    releaseUpper()
    expect(modalStackDepth()).toBe(0)
  })
})
