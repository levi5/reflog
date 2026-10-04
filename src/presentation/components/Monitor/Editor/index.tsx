import { Play, Plus, Save, Trash2 } from "lucide-react"
import { useRef, useState } from "react"
import type { MonitorAutomation, MonitorBlock } from "../../../../domain/entities/automations"
import { MONITOR_BLOCK_TEMPLATES } from "../../../../shared/constants/automations"
import { newId } from "../../../../shared/utils/id"
import { useTranslation } from "../../../context"
import styles from "./style.module.scss"

export interface MonitorEditorProps {
  monitor: MonitorAutomation
  onSave: (monitor: MonitorAutomation) => void
  onRun: (monitor: MonitorAutomation) => void
  onDelete: (id: string) => void | Promise<void>
  onChooseRepository: () => Promise<string | null>
}

export function MonitorEditor({ monitor, onSave, onRun, onDelete, onChooseRepository }: MonitorEditorProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(monitor.name)
  const [color, setColor] = useState(monitor.color)
  const [repoPath, setRepoPath] = useState(monitor.repoPath)
  const [pathValue, setPathValue] = useState(monitor.path)
  const [blocks, setBlocks] = useState<MonitorBlock[]>(monitor.blocks)
  const commandIdsRef = useRef(new Map<string, string>())

  const commandKey = (blockId: string, commandIndex: number) => {
    const map = commandIdsRef.current
    const mapKey = `${blockId}:${commandIndex}`
    const existing = map.get(mapKey)
    if (existing) return existing
    const created = newId("cmd")
    map.set(mapKey, created)
    return created
  }

  const buildMonitor = (): MonitorAutomation => ({
    ...monitor,
    name,
    color,
    repoPath,
    path: pathValue,
    trigger: { kind: "manual" },
    blocks: blocks.map((block) => ({ ...block, commands: block.commands.map((command) => command.trim()) })),
  })

  const removeBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((block) => block.id !== blockId))
  }

  const moveBlock = (blockId: string, direction: number) => {
    setBlocks((prev) => {
      const index = prev.findIndex((block) => block.id === blockId)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
      return next
    })
  }

  const addCommand = (blockId: string) => {
    setBlocks((prev) =>
      prev.map((block) => (block.id === blockId ? { ...block, commands: [...block.commands, ""] } : block)),
    )
  }

  const updateBlockCommand = (blockId: string, commandIndex: number, value: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? {
              ...block,
              commands: block.commands.map((command, index) => (index === commandIndex ? value : command)),
            }
          : block,
      ),
    )
  }

  const addBlock = (template: (typeof MONITOR_BLOCK_TEMPLATES)[number]) => {
    setBlocks((prev) => [
      ...prev,
      {
        id: newId("block"),
        label: template.label,
        icon: template.icon,
        color: template.color,
        commands: [...template.defaultCommands],
      },
    ])
  }

  const templates = MONITOR_BLOCK_TEMPLATES.filter(
    (template) => template.category === "git" || template.category === "submodule",
  )

  return (
    <div className={styles.editor}>
      <header className={styles.header}>
        <div className={styles.fields}>
          <label>
            {t("monitorName")}
            <input value={name} placeholder={t("monitorNamePh")} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            {t("monitorFolderLabel")}
            <input
              value={pathValue}
              placeholder={t("monitorFolderPh")}
              onChange={(event) => setPathValue(event.target.value)}
            />
          </label>
          <label className={styles.repository}>
            {t("targetRepository")}
            <span>
              <input
                value={repoPath}
                placeholder={t("openRepository")}
                onChange={(event) => setRepoPath(event.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  void onChooseRepository().then((path) => {
                    if (path) setRepoPath(path)
                  })
                }}
              >
                {t("chooseRepository")}
              </button>
            </span>
          </label>
        </div>
        <div className={styles.colorRow}>
          <label className={styles.color}>
            {t("color")}
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </label>
        </div>
        <p>{t("monitorExecutionHint")}</p>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.palette}>
          <strong>{t("monitorStepAddBlocks")}</strong>
          <p>{t("monitorBlockHint")}</p>
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className={styles.template}
              style={{ borderLeftColor: template.color }}
              onClick={() => addBlock(template)}
            >
              <Plus size={13} /> {template.label}
            </button>
          ))}
        </aside>

        <div className={styles.blocks}>
          <div className={styles.blocksHead}>
            <strong>{t("monitorStepReview")}</strong>
            <span>
              {blocks.length} {t("steps").toLowerCase()}
            </span>
          </div>
          {blocks.length === 0 ? (
            <div className={styles.empty}>{t("monitorEmptyBlocks")}</div>
          ) : (
            blocks.map((block, blockIndex) => (
              <article key={block.id} className={styles.block}>
                <header style={{ borderLeftColor: block.color }}>
                  <strong>{block.label}</strong>
                  <div>
                    <button
                      type="button"
                      title={t("moveUp")}
                      disabled={blockIndex === 0}
                      onClick={() => moveBlock(block.id, -1)}
                    >
                      {t("moveUp")}
                    </button>
                    <button
                      type="button"
                      title={t("moveDown")}
                      disabled={blockIndex === blocks.length - 1}
                      onClick={() => moveBlock(block.id, 1)}
                    >
                      {t("moveDown")}
                    </button>
                    <button type="button" title={t("removeBlock")} onClick={() => removeBlock(block.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </header>
                {block.commands.map((command, commandIndex) => (
                  <input
                    key={commandKey(block.id, commandIndex)}
                    value={command}
                    aria-label={`${t("addCommand")} — ${block.label} #${commandIndex + 1}`}
                    placeholder="git pull --rebase"
                    onChange={(event) => updateBlockCommand(block.id, commandIndex, event.target.value)}
                  />
                ))}
                <button type="button" className={styles.addCommand} onClick={() => addCommand(block.id)}>
                  <Plus size={12} /> {t("addCommand")}
                </button>
              </article>
            ))
          )}
        </div>
      </div>

      <footer className={styles.footer}>
        <button type="button" onClick={() => void onDelete(monitor.id)}>
          <Trash2 size={13} /> {t("deleteMonitor")}
        </button>
        <div className={styles.footerActions}>
          <button type="button" onClick={() => onSave(buildMonitor())}>
            <Save size={13} /> {t("saveChanges")}
          </button>
          <button
            type="button"
            className="primary"
            disabled={blocks.length === 0}
            onClick={() => {
              const updated = buildMonitor()
              onSave(updated)
              onRun(updated)
            }}
          >
            <Play size={13} /> {t("saveAndRun")}
          </button>
        </div>
      </footer>
    </div>
  )
}
