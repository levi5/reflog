import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { Checkbox } from "../../../src/presentation/components/Checkbox"

function ControlledCheckbox({
  initial = false,
  onChange,
  disabled = false,
}: {
  initial?: boolean
  onChange: (checked: boolean, range: boolean) => void
  disabled?: boolean
}) {
  const [checked, setChecked] = useState(initial)
  return (
    <Checkbox
      checked={checked}
      disabled={disabled}
      label="Pick"
      onChange={(next, range) => {
        setChecked(next)
        onChange(next, range)
      }}
    />
  )
}

describe("Checkbox", () => {
  it("renders a real checkbox carrying the accessible label and the tooltip", () => {
    render(<Checkbox checked={false} onChange={() => {}} label="Select branch: main" />)
    const box = screen.getByRole("checkbox", { name: "Select branch: main" })
    expect(box.getAttribute("type")).toBe("checkbox")
    expect((box as HTMLInputElement).checked).toBe(false)
    expect(box.closest("label")?.getAttribute("title")).toBe("Select branch: main")
  })

  it("reflects the checked state and lets the parent own it", () => {
    const onChange = vi.fn()
    render(<ControlledCheckbox onChange={onChange} />)
    const box = screen.getByRole("checkbox") as HTMLInputElement
    expect(box.checked).toBe(false)
    fireEvent.click(box)
    expect(box.checked).toBe(true)
    expect(onChange).toHaveBeenLastCalledWith(true, false)
    fireEvent.click(box)
    expect(box.checked).toBe(false)
  })

  it("hands the shift modifier over so lists can select ranges", () => {
    const onChange = vi.fn()
    render(<ControlledCheckbox onChange={onChange} />)
    fireEvent.click(screen.getByRole("checkbox"), { shiftKey: true })
    expect(onChange).toHaveBeenCalledWith(true, true)
  })

  it("marks the input as disabled", () => {
    render(<Checkbox checked={false} onChange={() => {}} label="Pick" disabled />)
    expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(true)
  })
})
