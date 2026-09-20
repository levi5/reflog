import { useState } from "react"
import type { MonitorBlock } from "../../../../domain/entities/automations"
import { MONITOR_BLOCK_TEMPLATES } from "../../../../shared/constants/automations"
import { newId } from "../../../../shared/utils/id"
import type { TabItem } from "../../../../types/components"
import { Tabs } from "../../Tabs"

export interface BlockPaletteProps {
  onAddBlock: (block: MonitorBlock) => void
}

const CATEGORIES = ["git", "submodule", "node", "docker", "custom"] as const
type Category = (typeof CATEGORIES)[number]

const CATEGORY_ITEMS: TabItem<Category>[] = CATEGORIES.map((cat) => ({
  id: cat,
  label: cat.charAt(0).toUpperCase() + cat.slice(1),
}))

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  const [activeCategory, setActiveCategory] = useState<Category>("git")
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="block-palette">
      <div className="palette-header">
        <h3>Blocos de Comando</h3>
      </div>

      <Tabs<Category>
        value={activeCategory}
        onChange={setActiveCategory}
        items={CATEGORY_ITEMS}
        variant="segmented"
        size="sm"
        fullWidth
        ariaLabel="Categorias de blocos"
      />

      <div className="palette-search">
        <input
          type="text"
          placeholder="Buscar blocos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="palette-content">
        {MONITOR_BLOCK_TEMPLATES.filter((t) => {
          if (activeCategory && t.category !== activeCategory) return false
          if (!searchQuery) return true
          return t.label.toLowerCase().includes(searchQuery.toLowerCase())
        }).map((tmpl) => (
          <div key={tmpl.id} className="block-template" style={{ borderLeftColor: tmpl.color }}>
            <div className="block-template-header">
              <span className="block-icon" style={{ color: tmpl.color }}>
                {tmpl.icon}
              </span>
              <span className="block-label">{tmpl.label}</span>
            </div>
            <div className="block-default-commands">
              {tmpl.defaultCommands.map((cmd) => (
                <code key={`cmd-${cmd || "empty"}`} className="default-cmd">
                  {cmd || "(vazio)"}
                </code>
              ))}
            </div>
            <button
              type="button"
              className="add-block-btn"
              onClick={() => {
                const newBlock = {
                  id: newId("block"),
                  label: tmpl.label,
                  icon: tmpl.icon,
                  color: tmpl.color,
                  commands: [...tmpl.defaultCommands],
                }
                onAddBlock(newBlock)
              }}
            >
              Adicionar
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
