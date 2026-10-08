import classnames from "classnames"
import { ArrowUpRight, Boxes, ChevronRight, FolderGit2, History, Layers } from "lucide-react"
import { _Either } from "funcio"
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useNavigate } from "react-router-dom"

import { gitApi } from "../../../../infrastructure/git"
import type { SubmoduleInfo } from "../../../../types"
import { useRepoCore, useStagingSlice, useTranslation } from "../../../context"
import { Drawer } from "../../Drawer"
import { SearchField } from "../../Drawer/SearchField"
import { ShortcutHints } from "../../Drawer/ShortcutHints"
import {
  buildScopeGroups,
  filterScopeGroups,
  type ScopeGroup,
  type ScopeGroupId,
  type ScopeTarget,
  type ScopeTone,
} from "./scope-targets"

import styles from "./styles.module.scss"

interface RepoSwitchProps {
  isOpen: boolean
  onClose: () => void
}

const TONE_CLASS: Record<ScopeTone, string> = {
  ok: styles.toneOk,
  warn: styles.toneWarn,
  muted: styles.toneMuted,
  danger: styles.toneDanger,
}

const KIND_ICON: Record<ScopeGroupId, ReactNode> = {
  parents: <ArrowUpRight size={15} />,
  siblings: <Layers size={15} />,
  children: <Boxes size={15} />,
  recents: <History size={15} />,
}

function FooterHints() {
  const { t } = useTranslation()
  return (
    <ShortcutHints
      hints={[
        { keys: ["↑ ↓"], label: t("quickActionsNavigate") },
        { keys: ["Enter"], label: t("repoSwitcherOpen") },
        { keys: ["Alt", "R"], label: t("repoSwitcherToggle") },
        { keys: ["Esc"], label: t("close") },
      ]}
    />
  )
}

export function ScopeBreadcrumb({ repo, chain }: { repo: string; chain: string[] }) {
  const { format } = useTranslation()
  if (chain.length < 2) {
    return <p className={styles.currentPath}>{repo}</p>
  }
  return <p className={styles.currentPath}>{format("scopeSubmoduleOf", { parent: chain[chain.length - 2] })}</p>
}

function TargetRow({
  target,
  isActive,
  onSelect,
  onOpen,
}: {
  target: ScopeTarget
  isActive: boolean
  onSelect: () => void
  onOpen: (path: string) => void
}) {
  const { format } = useTranslation()
  const outdatedTip = target.outdated ? format("subBehind", { count: target.behind ?? 0 }) : undefined
  return (
    <li className={classnames(styles.targetItem, isActive && styles.selected)} data-scope-target={target.id}>
      <button
        type="button"
        className={styles.targetBtn}
        onClick={() => onOpen(target.path)}
        onFocus={onSelect}
        title={target.path}
      >
        <span className={classnames(styles.targetIcon, target.tone && TONE_CLASS[target.tone])} title={outdatedTip}>
          <FolderGit2 size={15} />
        </span>
        <span className={styles.targetInfo}>
          <span className={styles.targetRow}>
            <strong>{target.name}</strong>
            {target.badge && (
              <span className={classnames(styles.targetBadge, target.tone && TONE_CLASS[target.tone])}>
                {target.badge}
              </span>
            )}
          </span>
          <span className={styles.targetHint}>{target.hint}</span>
        </span>
        <ChevronRight size={14} className={styles.targetChevron} />
      </button>
    </li>
  )
}

export function ScopeGroupSection({
  group,
  activeId,
  onSelect,
  onOpen,
}: {
  group: ScopeGroup
  activeId: string
  onSelect: (id: string) => void
  onOpen: (path: string) => void
}) {
  const { t } = useTranslation()
  return (
    <section className={styles.group}>
      <h3 className={styles.groupTitle}>
        {KIND_ICON[group.id]}
        <span>{group.label}</span>
        <span className={styles.groupCount}>{group.targets.length}</span>
      </h3>
      <ul className={styles.targetList}>
        {group.targets.map((target) => (
          <TargetRow
            key={target.id}
            target={target}
            isActive={target.id === activeId}
            onSelect={() => onSelect(target.id)}
            onOpen={onOpen}
          />
        ))}
      </ul>
      {group.id === "parents" && <p className={styles.groupHint}>{t("repoSwitcherParentHint")}</p>}
    </section>
  )
}

export function RepoSwitcher({ isOpen, onClose }: RepoSwitchProps) {
  const repo = useRepoCore()
  const { submodules } = useStagingSlice()
  const { t, lang } = useTranslation()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeId, setActiveId] = useState("")
  const [siblingModules, setSiblingModules] = useState<SubmoduleInfo[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!isOpen) return
    setSearchQuery("")
    setActiveId("")
  }, [isOpen])

  useEffect(() => {
    const parent = repo.parentRepo
    if (!isOpen || !parent) {
      setSiblingModules([])
      return
    }
    let disposed = false
    void _Either.try
      .async(() => gitApi.submodules(parent))
      .then((box) => {
        if (!disposed) setSiblingModules(box.isRight() ? (box.value as SubmoduleInfo[]) : [])
      })
    return () => {
      disposed = true
    }
  }, [isOpen, repo.parentRepo])

  const groups = useMemo(
    () =>
      buildScopeGroups({
        lang,
        repo: repo.repo,
        chain: repo.repoChain,
        submodules,
        siblingModules,
        recents: repo.recents,
      }),
    [lang, repo.repo, repo.repoChain, submodules, siblingModules, repo.recents],
  )

  const visibleGroups = useMemo(() => filterScopeGroups(groups, searchQuery), [groups, searchQuery])
  const visibleTargets = useMemo(() => visibleGroups.flatMap((group) => group.targets), [visibleGroups])

  useEffect(() => {
    if (!isOpen || !activeId) return
    const item = listRef.current?.querySelector<HTMLElement>(`[data-scope-target="${CSS.escape(activeId)}"]`)
    item?.scrollIntoView({ block: "nearest" })
  }, [isOpen, activeId])

  const openTarget = useCallback(
    async (path: string) => {
      if (!path.trim()) return
      onClose()
      const ok = await repo.handleOpen(path)
      if (ok) navigate("/staging")
    },
    [navigate, onClose, repo.handleOpen],
  )

  const move = useCallback(
    (direction: 1 | -1) => {
      if (visibleTargets.length === 0) return
      const currentIndex = visibleTargets.findIndex((target) => target.id === activeId)
      const nextIndex = Math.max(0, Math.min(currentIndex + direction, visibleTargets.length - 1))
      setActiveId(visibleTargets[nextIndex]?.id ?? "")
    },
    [activeId, visibleTargets],
  )

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      move(event.key === "ArrowDown" ? 1 : -1)
      return
    }
    if (event.key !== "Enter") return
    const target = visibleTargets.find((entry) => entry.id === activeId) ?? visibleTargets[0]
    if (!target) return
    event.preventDefault()
    void openTarget(target.path)
  }

  const handleSearchChange = (nextQuery: string) => {
    setSearchQuery(nextQuery)
    setActiveId("")
  }

  return (
    <Drawer.Root name="repo-switch" open={isOpen} onClose={onClose}>
      <Drawer.Content
        title={repo.repoName}
        icon={<FolderGit2 size={18} />}
        closeLabel={t("close")}
        toolbar={
          <SearchField
            label={t("searchRepoSwitcher")}
            value={searchQuery}
            inputRef={searchInputRef}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
          />
        }
        footer={<FooterHints />}
      >
        <ScopeBreadcrumb repo={repo.repo} chain={repo.repoChain} />
        {visibleGroups.length === 0 ? (
          <div className={styles.empty}>
            <Layers size={32} />
            <strong>{t("noRepoTargets")}</strong>
            <p>{t("repoSwitcherEmptyHint")}</p>
          </div>
        ) : (
          <div ref={listRef}>
            {visibleGroups.map((group) => (
              <ScopeGroupSection
                key={group.id}
                group={group}
                activeId={activeId}
                onSelect={setActiveId}
                onOpen={(path) => void openTarget(path)}
              />
            ))}
          </div>
        )}
      </Drawer.Content>
    </Drawer.Root>
  )
}
