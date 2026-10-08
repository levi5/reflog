import classnames from "classnames"
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "../../../context"
import { isTopModal, modalStackDepth, pushModal } from "../../../hooks/ui/useModalStack"
import { type PaletteEntry, usePaletteEntries } from "./entries"
import { fuzzyMatch } from "./fuzzy"
import styles from "./style.module.scss"

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
const LIST_ID = "command-palette-list"

export function CommandPalette() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const paletteId = useRef(Symbol("palette"))
  const entries = usePaletteEntries()

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    const id = paletteId.current
    const release = pushModal(id)
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    setQuery("")
    setActiveIndex(0)
    inputRef.current?.focus()

    const onKey = (event: globalThis.KeyboardEvent) => {
      if (!isTopModal(id)) return
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
        return
      }
      if (event.key !== "Tab" || !overlayRef.current) return
      const focusables = Array.from(overlayRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey, true)
    return () => {
      document.removeEventListener("keydown", onKey, true)
      release()
      if (modalStackDepth() === 0) document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [open])

  const filtered = useMemo(
    () => entries.filter((entry) => fuzzyMatch(query, `${entry.label} ${entry.id}`)),
    [entries, query],
  )
  const boundedActive = filtered.length === 0 ? 0 : Math.min(activeIndex, filtered.length - 1)

  useEffect(() => {
    if (!open) return
    listRef.current?.children[boundedActive]?.scrollIntoView({ block: "nearest" })
  }, [open, boundedActive])

  if (!open) return null

  const runEntry = (entry: PaletteEntry) => {
    if (entry.disabled) return
    setOpen(false)
    entry.run()
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(filtered.length - 1, 0)))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    } else if (event.key === "Home") {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === "End") {
      event.preventDefault()
      setActiveIndex(Math.max(filtered.length - 1, 0))
    } else if (event.key === "Enter") {
      const entry = filtered[boundedActive]
      if (entry) {
        event.preventDefault()
        runEntry(entry)
      }
    } else if (event.key === "Escape") {
      setOpen(false)
    }
  }

  const rows = filtered.map((entry, entryIndex) => ({ entry, entryIndex }))
  const groups = rows.reduce<{ name: string; items: typeof rows }[]>((acc, row) => {
    const last = acc[acc.length - 1]
    if (last && last.name === row.entry.group) last.items.push(row)
    else acc.push({ name: row.entry.group, items: [row] })
    return acc
  }, [])
  const activeId = filtered.length > 0 ? `${LIST_ID}-${boundedActive}` : undefined

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={t("commandPalette")}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false)
      }}
    >
      <div className={styles.palette}>
        <input
          ref={inputRef}
          className={styles.input}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={handleInputKeyDown}
          placeholder={t("palettePlaceholder")}
          aria-label={t("commandPalette")}
          role="combobox"
          aria-expanded="true"
          aria-controls={LIST_ID}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
        />
        {filtered.length === 0 ? (
          <p className={styles.empty}>{t("paletteNoResults")}</p>
        ) : (
          <div ref={listRef} id={LIST_ID} className={styles.list} role="listbox" aria-label={t("commandPalette")}>
            {groups.map((group) => (
              <fieldset key={group.name} className={styles.groupList}>
                <legend className={styles.groupLabel}>{group.name}</legend>
                {group.items.map(({ entry, entryIndex }) => (
                  <div key={entry.id} className={styles.itemRow}>
                    <button
                      type="button"
                      id={`${LIST_ID}-${entryIndex}`}
                      role="option"
                      aria-selected={entryIndex === boundedActive}
                      aria-disabled={entry.disabled || undefined}
                      className={classnames(styles.item, entryIndex === boundedActive && styles.active)}
                      disabled={entry.disabled}
                      onClick={() => runEntry(entry)}
                      onMouseMove={() => setActiveIndex(entryIndex)}
                    >
                      <span className={styles.itemIcon}>{entry.icon}</span>
                      <span className={styles.itemLabel}>{entry.label}</span>
                      <kbd className={styles.itemHint}>↵</kbd>
                    </button>
                  </div>
                ))}
              </fieldset>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
