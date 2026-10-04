import classnames from "classnames"
import {
  BookOpen,
  Download,
  FileText,
  ListChecks,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings as SettingsIcon,
  Upload,
} from "lucide-react"
import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { VIEW_LABELS, VIEW_TABS } from "../../../../shared/constants"
import { useCommitSlice, useRepoCore, useTranslation } from "../../../context"
import { isTopModal, modalStackDepth, pushModal } from "../../../hooks/ui/useModalStack"
import { fuzzyMatch } from "./fuzzy"
import styles from "./style.module.scss"

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
const LIST_ID = "command-palette-list"

interface PaletteEntry {
  id: string
  label: string
  group: string
  icon: ReactNode
  disabled?: boolean
  run: () => void
}

function usePaletteEntries(): PaletteEntry[] {
  const { t } = useTranslation()
  const repo = useRepoCore()
  const commitSlice = useCommitSlice()
  const navigate = useNavigate()
  const location = useLocation()

  return useMemo(() => {
    const navGroup = t("paletteNav")
    const actionGroup = t("paletteActions")
    const navEntries: PaletteEntry[] = [
      ...VIEW_TABS.map(({ id, icon: Icon }) => ({
        id: `nav-${id}`,
        label: t(VIEW_LABELS[id]),
        group: navGroup,
        icon: <Icon size={15} />,
        run: () => navigate(`/${id}`),
      })),
      {
        id: "nav-docs",
        label: t("docs"),
        group: navGroup,
        icon: <BookOpen size={15} />,
        run: () => navigate("/docs"),
      },
      {
        id: "nav-monitors",
        label: t("monitors"),
        group: navGroup,
        icon: <ListChecks size={15} />,
        run: () => navigate("/monitors"),
      },
      {
        id: "nav-templates",
        label: t("templateTitle"),
        group: navGroup,
        icon: <FileText size={15} />,
        run: () => navigate("/templates"),
      },
      {
        id: "nav-settings",
        label: t("settings"),
        group: navGroup,
        icon: <SettingsIcon size={15} />,
        run: () => navigate("/settings"),
      },
    ]
    const repoUnavailable = !repo.repo || repo.busy
    const actionEntries: PaletteEntry[] = [
      {
        id: "action-stage-all",
        label: t("stageAll"),
        group: actionGroup,
        icon: <Plus size={15} />,
        disabled: repoUnavailable,
        run: () => {
          if (location.pathname !== "/staging") navigate("/staging")
          void commitSlice.stageAll()
        },
      },
      {
        id: "action-fetch",
        label: t("fetch"),
        group: actionGroup,
        icon: <RefreshCw size={15} />,
        disabled: repoUnavailable,
        run: () => void repo.fetchPrune(),
      },
      {
        id: "action-pull",
        label: t("pull"),
        group: actionGroup,
        icon: <Download size={15} />,
        disabled: repoUnavailable,
        run: () => void repo.pullIt(),
      },
      {
        id: "action-push",
        label: t("push"),
        group: actionGroup,
        icon: <Upload size={15} />,
        disabled: repoUnavailable,
        run: () => void repo.pushIt(),
      },
      {
        id: "action-refresh",
        label: t("refresh"),
        group: actionGroup,
        icon: <RotateCcw size={15} />,
        disabled: repoUnavailable,
        run: () => void repo.refresh(repo.repo),
      },
    ]
    return [...navEntries, ...actionEntries]
  }, [t, repo, commitSlice, navigate, location.pathname])
}

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
