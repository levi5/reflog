import { conflictResolverUseCase } from "../../../../../data"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Choice } from "../../../../../domain/entities/conflict/conflicts"
import type { ConflictBlock, ConflictFile } from "../../../../../types"
import { useTranslation } from "../../../../context"
import { scrollIntoViewSafely } from "../../../../hooks"
import { EmptyState } from "../../../Empty/State"
import { CompareModal } from "../../Compare/Modal"
import { FileTabBar } from "../../File/TabBar"
import { HunkBlock } from "../Hunk"
import styles from "./style.module.scss"

interface Props {
  file: ConflictFile
  content: string
  hunkIndex: number
  saving: boolean
  setContent: (c: string) => void
  setHunkIndex: (n: number) => void
  onSave: () => void
  onResolve: () => void
}

export function InlineEditor(props: Props) {
  const { file, content, hunkIndex, saving, setContent, setHunkIndex, onSave, onResolve } = props
  const { t, format } = useTranslation()
  const blocks = useMemo(() => conflictResolverUseCase.parseConflicts(content), [content])
  const [compare, setCompare] = useState<ConflictBlock | null>(null)

  useEffect(() => {
    if (blocks.length === 0 && hunkIndex !== 0) setHunkIndex(0)
    if (blocks.length > 0 && hunkIndex >= blocks.length) setHunkIndex(blocks.length - 1)
  }, [blocks.length, hunkIndex, setHunkIndex])

  const active = blocks[hunkIndex]

  useEffect(() => {
    if (!active) return
    scrollIntoViewSafely(document.getElementById(`hunk-${active.id}`), { block: "center" })
  }, [active])

  const apply = useCallback(
    (block: ConflictBlock, choice: Choice) =>
      setContent(conflictResolverUseCase.applyChoiceToContent(content, block, choice, true)),
    [content, setContent],
  )

  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const current = activeRef.current
      if (!current) return
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      if (!event.altKey) return
      const key = event.key.toLowerCase()
      const choice: Choice | null = key === "1" ? "current" : key === "2" ? "incoming" : key === "b" ? "both" : null
      if (choice === null) return
      event.preventDefault()
      apply(current, choice)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [apply])

  const lines = useMemo(() => content.split("\n"), [content])
  const byStart = useMemo(() => {
    const m = new Map<number, { block: ConflictBlock; idx: number }>()
    blocks.forEach((b, idx) => {
      m.set(b.start_line, { block: b, idx })
    })
    return m
  }, [blocks])

  const goHunk = (dir: 1 | -1) => {
    if (blocks.length === 0) return
    setHunkIndex((hunkIndex + dir + blocks.length) % blocks.length)
  }

  const body: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const lineNo = i + 1
    const hit = byStart.get(lineNo)
    if (hit) {
      body.push(
        <HunkBlock
          key={`hunk-${hit.block.id}`}
          block={hit.block}
          selected={hit.idx === hunkIndex}
          onSelect={() => setHunkIndex(hit.idx)}
          onAccept={apply}
          onCompare={setCompare}
        />,
      )
      i = hit.block.end_line
      continue
    }
    body.push(
      <div key={`l${lineNo}`} className={styles.codeRow}>
        <span className={styles.ln}>{lineNo}</span>
        <span className={styles.lc}>{lines[i] === "" ? " " : lines[i]}</span>
      </div>,
    )
    i++
  }

  const shortName = file.path.split("/").pop() ?? file.path

  return (
    <div className={styles.inlineWrap}>
      <FileTabBar
        fileName={shortName}
        count={blocks.length}
        cursorLine={active ? active.start_line : 1}
        hunkCurrent={blocks.length === 0 ? 0 : hunkIndex + 1}
        hunkTotal={blocks.length}
        completeTitle={blocks.length > 0 ? `${blocks.length} ${t("remaining")}` : ""}
        completeDisabled={saving || blocks.length > 0}
        onPrev={() => goHunk(-1)}
        onNext={() => goHunk(1)}
        onCompare={() => active && setCompare(active)}
        onComplete={onResolve}
      />
      {blocks.length === 0 ? (
        <EmptyState ok message={t("noConflicts")} />
      ) : (
        <div className={styles.inlineEditor}>{body}</div>
      )}
      <div className={styles.inlineFooter}>
        <button
          type="button"
          className="primary"
          onClick={onSave}
          disabled={saving || blocks.length > 0}
          title={blocks.length > 0 ? format("resolveConflictsFirst", { count: blocks.length }) : t("save")}
        >
          {t("save")}
        </button>
        <button type="button" className="success" onClick={onResolve} disabled={saving || blocks.length > 0}>
          {t("stageResolved")}
        </button>
        <span className={styles.hint}>{t("manualEditHint")}</span>
      </div>
      {compare && <CompareModal block={compare} onClose={() => setCompare(null)} onAccept={apply} />}
    </div>
  )
}
