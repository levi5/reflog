import { FileText } from "lucide-react"
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import { useRepoCore, useStagingSlice, useTranslation } from "../../../context"
import { fuzzyMatch } from "../Palette/fuzzy"
import { Modal } from "../../Modal"
import styles from "./style.module.scss"

const MAX_RESULTS = 40

export interface QuickOpenProps {
  open: boolean
  onClose: () => void
}

export function QuickOpen({ open, onClose }: QuickOpenProps) {
  const { t, format } = useTranslation()
  const repo = useRepoCore()
  const { trackedFiles, loadTracked } = useStagingSlice()
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      return
    }
    if (wasOpenRef.current) return
    wasOpenRef.current = true
    setQuery("")
    setActiveIndex(0)
  }, [open])

  useEffect(() => {
    if (!open || !repo.repo) return
    if (trackedFiles.length === 0) void loadTracked()
  }, [open, repo.repo, trackedFiles.length, loadTracked])

  const results = useMemo(() => {
    if (!query.trim()) return trackedFiles.slice(0, MAX_RESULTS)
    return trackedFiles.filter((file: string) => fuzzyMatch(query, file)).slice(0, MAX_RESULTS)
  }, [query, trackedFiles])

  const boundedActive = results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1)

  useEffect(() => {
    if (!open) return
    listRef.current?.children[boundedActive]?.scrollIntoView({ block: "nearest" })
  }, [open, boundedActive])

  if (!open) return null

  const choose = (file: string) => {
    onClose()
    navigate(`/blame?file=${encodeURIComponent(file)}`)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(results.length - 1, 0)))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    } else if (event.key === "Enter") {
      const file = results[boundedActive]
      if (file) {
        event.preventDefault()
        choose(file)
      }
    }
  }

  return (
    <Modal title={t("quickOpenTitle")} size="md" onClose={onClose} initialFocus={inputRef}>
      <div className={styles.wrap}>
        <input
          ref={inputRef}
          type="search"
          className={styles.input}
          value={query}
          placeholder={t("quickOpenPlaceholder")}
          aria-label={t("quickOpenTitle")}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results.length > 0 ? `${listId}-${boundedActive}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={onKeyDown}
        />
        {results.length === 0 ? (
          <p className={styles.empty}>{format("searchNoResultsFiles", { query: query.trim() })}</p>
        ) : (
          <div ref={listRef} id={listId} className={styles.list} role="listbox" aria-label={t("quickOpenTitle")}>
            {results.map((file: string, index: number) => (
              <button
                key={file}
                type="button"
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === boundedActive}
                className={index === boundedActive ? styles.active : undefined}
                onClick={() => choose(file)}
                onMouseMove={() => setActiveIndex(index)}
              >
                <FileText size={13} aria-hidden />
                <span>{file}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
