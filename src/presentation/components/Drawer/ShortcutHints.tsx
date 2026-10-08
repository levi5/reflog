export interface ShortcutHint {
  keys: string[]
  label: string
}

export function ShortcutHints({ hints }: { hints: ShortcutHint[] }) {
  return (
    <>
      {hints.map((hint) => (
        <span key={hint.label}>
          {hint.keys.map((key) => (
            <kbd key={key}>{key}</kbd>
          ))}{" "}
          {hint.label}
        </span>
      ))}
    </>
  )
}
