import classnames from "classnames"
import { Bolt, Bot, ListChecks, Play, Search, Trash2 } from "lucide-react"
import { type KeyboardEvent, type RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import { useTranslation } from "../../../context"

import { Drawer } from "../../Drawer"

import type { AutomationShortcut } from "../../../../domain/entities/automations"
import { useRepoCore } from "../../../context"
import { useAutomations } from "../../../hooks"
import { matchesSearch, resolveShortcutTarget } from "./shortcutUtils"

import styles from "./styles.module.scss"

interface QuickActionsSidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchToolbarProps {
  searchQuery: string
  searchInputRef: RefObject<HTMLInputElement | null>
  onSearchChange: (searchQuery: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}

function SearchToolbar({ searchQuery, searchInputRef, onSearchChange, onKeyDown }: SearchToolbarProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.searchBox}>
      <Search size={16} className={styles.searchIcon} aria-hidden />
      <input
        ref={searchInputRef}
        type="search"
        placeholder={t("searchQuickActions")}
        aria-label={t("searchQuickActions")}
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}

function FooterHints() {
  const { t } = useTranslation()
  return (
    <>
      <span>
        <kbd>↑ ↓</kbd> {t("quickActionsNavigate")}
      </span>
      <span>
        <kbd>Enter</kbd> {t("quickActionsRun")}
      </span>
      <span>
        <kbd>Esc</kbd> {t("close")}
      </span>
    </>
  )
}

function EmptyQuickActions({ hasSearchQuery }: { hasSearchQuery: boolean }) {
  const { t } = useTranslation()
  return (
    <div className={styles.empty}>
      <Bolt size={32} />
      <strong>{t(hasSearchQuery ? "noMatchingQuickActions" : "noQuickActions")}</strong>
      <p>{t(hasSearchQuery ? "quickActionsSearchHint" : "noQuickActionsHint")}</p>
    </div>
  )
}

interface ShortcutItemProps {
  shortcut: AutomationShortcut
  displayName: string
  isRecipe: boolean
  isSelected: boolean
  isDisabled: boolean
  canRemove: boolean
  onRun: (shortcut: AutomationShortcut, options?: { closeDrawer?: boolean }) => void
  onSelect: () => void
  onRemove: (shortcutId: string) => void
}

function ShortcutItem({
  shortcut,
  displayName,
  isRecipe,
  isSelected,
  isDisabled,
  canRemove,
  onRun,
  onSelect,
  onRemove,
}: ShortcutItemProps) {
  const { t } = useTranslation()
  const TargetIcon = isRecipe ? Bot : ListChecks

  return (
    <li
      className={classnames(styles.actionItem, isSelected && styles.selected)}
      style={{ borderLeftColor: shortcut.color }}
    >
      <button
        type="button"
        className={styles.runBtn}
        disabled={isDisabled}
        onClick={() => onRun(shortcut, { closeDrawer: true })}
        onFocus={onSelect}
        title={displayName}
      >
        <span className={styles.colorDot} style={{ backgroundColor: shortcut.color }} />
        <span className={styles.actionInfo}>
          <span className={styles.actionRow}>
            <TargetIcon size={15} />
            <strong>{displayName}</strong>
          </span>
          <span className={styles.actionType}>{t(isRecipe ? "recipeShort" : "monitorShort")}</span>
        </span>
      </button>
      <button
        type="button"
        className={styles.executeBtn}
        title={`${t("quickActionsRun")}: ${displayName}`}
        aria-label={`${t("quickActionsRun")}: ${displayName}`}
        disabled={isDisabled}
        onClick={(event) => {
          event.stopPropagation()
          onRun(shortcut, { closeDrawer: false })
        }}
      >
        <Play size={13} />
      </button>
      <button
        type="button"
        className={styles.removeBtn}
        title={t("removeShortcut")}
        aria-label={`${t("removeShortcut")}: ${displayName}`}
        disabled={!canRemove}
        onClick={() => onRemove(shortcut.id)}
      >
        <Trash2 size={14} />
      </button>
    </li>
  )
}

export function QuickActionsSidebar({ isOpen, onClose }: QuickActionsSidebarProps) {
  const repoContext = useRepoCore()
  const { t } = useTranslation()
  const automations = useAutomations({
    repoRoot: repoContext.repo,
    submodulePaths: [],
    refreshRepo: () => repoContext.refresh(repoContext.repo),
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const shortcutListRef = useRef<HTMLUListElement>(null)

  const recipesById = useMemo(
    () => new Map(automations.recipes.map((recipe) => [recipe.id, recipe])),
    [automations.recipes],
  )
  const monitorsById = useMemo(
    () => new Map(automations.monitors.map((monitor) => [monitor.id, monitor])),
    [automations.monitors],
  )

  const filteredShortcuts = useMemo(
    () =>
      automations.shortcuts.filter((shortcut) => matchesSearch(shortcut, recipesById, monitorsById, t, searchQuery)),
    [automations.shortcuts, recipesById, monitorsById, t, searchQuery],
  )

  const activeIndex = Math.max(0, Math.min(selectedIndex, filteredShortcuts.length - 1))
  const selectedShortcutId = filteredShortcuts[activeIndex]?.id

  useLayoutEffect(() => {
    if (!isOpen) return
    automations.reloadStore()
    setSearchQuery("")
    setSelectedIndex(0)
  }, [isOpen, automations.reloadStore])

  useEffect(() => {
    if (!isOpen || !selectedShortcutId) return
    shortcutListRef.current?.children[activeIndex]?.scrollIntoView({
      block: "nearest",
    })
  }, [isOpen, activeIndex, selectedShortcutId])

  const confirmRemoveShortcut = async (shortcutId: string) => {
    const target = filteredShortcuts.find((shortcut) => shortcut.id === shortcutId)
    const { displayName } = target
      ? resolveShortcutTarget(target, recipesById, monitorsById)
      : { displayName: shortcutId }
    const confirmed = await repoContext.requestConfirm(
      t("deleteShortcutAction"),
      t("deleteShortcutConfirm").replace("{name}", displayName),
    )
    if (!confirmed) return
    automations.deleteShortcut(shortcutId)
  }

  const handleRunShortcut = (
    shortcut: AutomationShortcut,
    options: { closeDrawer?: boolean } = { closeDrawer: true },
  ) => {
    if (automations.running) return
    const { repoPath, isRecipe } = resolveShortcutTarget(shortcut, recipesById, monitorsById)
    const hasRepo = Boolean(repoPath.trim() || repoContext.repo)
    if (!hasRepo) return
    if (isRecipe) {
      const recipe = recipesById.get(shortcut.targetId)
      if (!recipe) return
      void automations.runRecipe(recipe, {})
    } else {
      const monitor = monitorsById.get(shortcut.targetId)
      if (!monitor) return
      void automations.runMonitor(monitor)
    }
    if (options.closeDrawer) {
      onClose()
    }
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      if (event.key === "Enter") {
        const activeShortcut = filteredShortcuts[activeIndex]
        if (!activeShortcut) return
        event.preventDefault()
        handleRunShortcut(activeShortcut)
      }
      return
    }
    event.preventDefault()
    const direction = event.key === "ArrowDown" ? 1 : -1
    setSelectedIndex(Math.max(0, Math.min(activeIndex + direction, filteredShortcuts.length - 1)))
  }

  const handleSearchChange = (nextQuery: string) => {
    setSearchQuery(nextQuery)
    setSelectedIndex(0)
  }

  return (
    <Drawer.Root name="quick-actions" open={isOpen} onClose={onClose}>
      <Drawer.Content
        title={t("quickActions")}
        icon={<Bolt size={18} />}
        closeLabel={t("close")}
        toolbar={
          <SearchToolbar
            searchQuery={searchQuery}
            searchInputRef={searchInputRef}
            onSearchChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
          />
        }
        footer={<FooterHints />}
      >
        {filteredShortcuts.length === 0 ? (
          <EmptyQuickActions hasSearchQuery={Boolean(searchQuery.trim())} />
        ) : (
          <ul ref={shortcutListRef} className={styles.actionList}>
            {filteredShortcuts.map((shortcut, shortcutIndex) => {
              const { displayName, repoPath, isRecipe } = resolveShortcutTarget(shortcut, recipesById, monitorsById)
              const hasRepo = Boolean(repoPath.trim() || repoContext.repo)
              return (
                <ShortcutItem
                  key={shortcut.id}
                  shortcut={shortcut}
                  displayName={displayName}
                  isRecipe={isRecipe}
                  isSelected={shortcutIndex === activeIndex}
                  isDisabled={automations.running || !hasRepo}
                  canRemove={!automations.running}
                  onRun={handleRunShortcut}
                  onSelect={() => setSelectedIndex(shortcutIndex)}
                  onRemove={(shortcutId) => void confirmRemoveShortcut(shortcutId)}
                />
              )
            })}
          </ul>
        )}
      </Drawer.Content>
    </Drawer.Root>
  )
}
