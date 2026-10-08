import { Eye, GitBranch, Play, Trash2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "../../../context"
import type { StashItem } from "../../../../types"
import { EmptyState } from "../../Empty/State"
import { ActionButton } from "../../Button"
import { Switch } from "../../Switch"
import styles from "./style.module.scss"

interface StashPanelProps {
  stashMessage: string
  onStashMessageChange: (stashMessage: string) => void
  keepIndex?: boolean
  onKeepIndexChange?: (v: boolean) => void
  stagedOnly?: boolean
  onStagedOnlyChange?: (v: boolean) => void
  pathspec?: string
  onPathspecChange?: (v: string) => void
  onStash: () => void
  onPop: (index?: number) => void
  onClear?: () => void
  stashes?: StashItem[]
  onApply?: (index: number) => void
  onApplyFile?: (index: number, file: string) => void
  onBranch?: (index: number, branch: string) => void
  onDrop?: (index: number) => void
  onShowDiff?: (index: number) => Promise<string>
  busy?: boolean
}

export function StashPanel({
  stashMessage,
  onStashMessageChange,
  keepIndex = false,
  onKeepIndexChange,
  stagedOnly = false,
  onStagedOnlyChange,
  pathspec = "",
  onPathspecChange,
  onStash,
  onPop,
  onClear,
  stashes = [],
  onApply,
  onApplyFile,
  onBranch,
  onDrop,
  onShowDiff,
  busy = false,
}: StashPanelProps) {
  const { t } = useTranslation()
  const [activeDiffIndex, setActiveDiffIndex] = useState<number | null>(null)
  const [diffText, setDiffText] = useState<string>("")
  const [loadingDiff, setLoadingDiff] = useState(false)
  const [branchNames, setBranchNames] = useState<Record<number, string>>({})
  const [filePaths, setFilePaths] = useState<Record<number, string>>({})

  const handleToggleDiff = async (index: number) => {
    if (activeDiffIndex === index) {
      setActiveDiffIndex(null)
      setDiffText("")
      return
    }
    setActiveDiffIndex(index)
    if (onShowDiff) {
      setLoadingDiff(true)
      try {
        const text = await onShowDiff(index)
        setDiffText(text || t("noDiff"))
      } catch (e: unknown) {
        setDiffText(String(e))
      } finally {
        setLoadingDiff(false)
      }
    }
  }

  return (
    <div className={styles.stashContainer}>
      <div className={styles.topRow}>
        <input
          placeholder={`${t("stash")}...`}
          aria-label={t("stashMessage")}
          value={stashMessage}
          onChange={(event) => onStashMessageChange(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && onStash()}
        />
        <button type="button" onClick={onStash} disabled={busy} title={t("saveStash")}>
          {t("saveStash")}
        </button>
        <button type="button" onClick={() => onPop()} disabled={busy} title={t("stashPop")}>
          {t("stashPopIndex")}
        </button>
        {onClear && stashes.length > 0 && (
          <button type="button" onClick={onClear} disabled={busy} title={t("stashClear")}>
            {t("stashClear")}
          </button>
        )}
      </div>

      <div className={styles.rowFlex}>
        <Switch
          size="sm"
          checked={keepIndex}
          disabled={stagedOnly || busy || !onKeepIndexChange}
          onChange={(value) => onKeepIndexChange?.(value)}
          label={t("stashKeepIndex")}
          ariaLabel={t("stashKeepIndex")}
          title={t("stashKeepIndexHint")}
        />
        <Switch
          size="sm"
          checked={stagedOnly}
          disabled={keepIndex || busy || !onStagedOnlyChange}
          onChange={(value) => onStagedOnlyChange?.(value)}
          label={t("stashStaged")}
          ariaLabel={t("stashStaged")}
          title={t("stashStagedHint")}
        />
      </div>
      {onPathspecChange && (
        <div className={styles.rowFlex}>
          <input
            placeholder={t("stashPathspecPh")}
            aria-label={t("stashPathspec")}
            value={pathspec}
            onChange={(event) => onPathspecChange(event.target.value)}
            title={t("stashPathspecHint")}
          />
        </div>
      )}

      <div className={styles.stashList}>
        {stashes.map((stash) => {
          const isViewingDiff = activeDiffIndex === stash.index
          return (
            <div key={stash.selector} className={styles.stashCard}>
              <div className={styles.cardTop}>
                <span className={styles.selector}>{stash.selector}</span>
                <span className={styles.date}>{stash.date}</span>
              </div>
              <div className={styles.message}>{stash.message}</div>
              <div className={styles.cardActions}>
                <ActionButton
                  icon={<Play size={11} />}
                  onClick={() => onPop(stash.index)}
                  disabled={busy}
                  title={t("stashPopIndex")}
                >
                  {t("stashPopIndex")}
                </ActionButton>
                {onApply && (
                  <ActionButton
                    icon={<Play size={11} />}
                    onClick={() => onApply(stash.index)}
                    disabled={busy}
                    title={t("stashApply")}
                  >
                    {t("stashApply")}
                  </ActionButton>
                )}
                {onShowDiff && (
                  <ActionButton
                    icon={<Eye size={11} />}
                    onClick={() => void handleToggleDiff(stash.index)}
                    title={t("stashViewDiff")}
                  >
                    {t("stashViewDiff")}
                  </ActionButton>
                )}
                {onDrop && (
                  <ActionButton
                    icon={<Trash2 size={11} />}
                    onClick={() => onDrop(stash.index)}
                    disabled={busy}
                    title={t("stashDrop")}
                    tone="danger"
                  >
                    {t("stashDrop")}
                  </ActionButton>
                )}
                {onBranch && (
                  <span className={styles.branchRow} title={t("stashBranchHint")}>
                    <GitBranch size={11} />
                    <input
                      className={styles.branchInput}
                      placeholder={t("stashBranchPh")}
                      aria-label={t("stashBranch")}
                      value={branchNames[stash.index] ?? ""}
                      onChange={(event) =>
                        setBranchNames((current) => ({ ...current, [stash.index]: event.target.value }))
                      }
                      disabled={busy}
                    />
                    <ActionButton
                      onClick={() => onBranch(stash.index, branchNames[stash.index] ?? "")}
                      disabled={busy || !(branchNames[stash.index] ?? "").trim()}
                    >
                      {t("stashBranch")}
                    </ActionButton>
                  </span>
                )}
              </div>
              {onApplyFile && (
                <div className={styles.rowFlex}>
                  <input
                    placeholder={t("stashFilePh")}
                    aria-label={t("stashFile")}
                    value={filePaths[stash.index] ?? ""}
                    onChange={(event) => setFilePaths((current) => ({ ...current, [stash.index]: event.target.value }))}
                    disabled={busy}
                    title={t("stashFileHint")}
                  />
                  <ActionButton
                    onClick={() => onApplyFile(stash.index, filePaths[stash.index] ?? "")}
                    disabled={busy || !(filePaths[stash.index] ?? "").trim()}
                    title={t("stashFile")}
                  >
                    {t("stashFile")}
                  </ActionButton>
                </div>
              )}
              {isViewingDiff && <pre className={styles.diffBox}>{loadingDiff ? t("loading") : diffText}</pre>}
            </div>
          )
        })}
        {stashes.length === 0 && <EmptyState small message={t("noStashes")} />}
      </div>
    </div>
  )
}
