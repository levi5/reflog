import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"

import { ActionButton, IconActionButton } from "../../../src/presentation/components/Button"
import { TranslationProvider } from "../../../src/presentation/context/translation/translation-context"

function renderWithTranslation(node: ReactElement) {
  return render(<TranslationProvider>{node}</TranslationProvider>)
}

describe("ActionButton", () => {
  it("renders the label with its tooltip and calls onClick", async () => {
    const onClick = vi.fn()
    renderWithTranslation(
      <ActionButton onClick={onClick} title="Pop">
        Aplicar
      </ActionButton>,
    )
    const button = screen.getByRole("button")
    expect(button.textContent).toContain("Aplicar")
    expect(button.getAttribute("title")).toBe("Pop")
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("never fires while disabled", async () => {
    const onClick = vi.fn()
    renderWithTranslation(
      <ActionButton onClick={onClick} disabled>
        Aplicar
      </ActionButton>,
    )
    const button = screen.getByRole("button")
    expect(button.hasAttribute("disabled")).toBe(true)
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it("uses the aria-label when the text is not descriptive", () => {
    renderWithTranslation(<ActionButton ariaLabel="Copiar hash">50c7b05</ActionButton>)
    expect(screen.getByLabelText("Copiar hash")).toBeTruthy()
  })

  it("keeps the icon next to the label", () => {
    renderWithTranslation(<ActionButton icon={<span data-testid="icon" />}>Aplicar</ActionButton>)
    expect(screen.getByTestId("icon")).toBeTruthy()
  })
})

describe("IconActionButton", () => {
  it("exposes the label as accessible name and tooltip", () => {
    renderWithTranslation(<IconActionButton icon={<span />} label="Excluir" onClick={() => {}} />)
    const button = screen.getByRole("button", { name: "Excluir" })
    expect(button.getAttribute("title")).toBe("Excluir")
  })

  it("calls onClick", async () => {
    const onClick = vi.fn()
    renderWithTranslation(<IconActionButton icon={<span />} label="Excluir" onClick={onClick} />)
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it("disables the action", () => {
    renderWithTranslation(<IconActionButton icon={<span />} label="Executar" disabled onClick={() => {}} />)
    expect(screen.getByRole("button", { name: "Executar" }).hasAttribute("disabled")).toBe(true)
  })
})
