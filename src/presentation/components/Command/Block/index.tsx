import classnames from "classnames"
import { ChevronDown, Play, RefreshCw } from "lucide-react"
import { useState } from "react"

import { Switch } from "../../Switch"

import type { BlockCategory, CommandBlock } from "../../../cms/blocks/visualizeBlocks"
import { useTranslation } from "../../../context"

import styles from "../style.module.scss"

interface CommandBlocksProps {
  running: boolean
  categories: readonly BlockCategory[]
  blocks: readonly CommandBlock[]
  onRun: (command: string) => void
}

export function CommandBlocks({ running, categories, blocks, onRun }: CommandBlocksProps) {
  const { lang } = useTranslation()
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [flagValues, setFlagValues] = useState<Record<string, boolean>>({})
  const [expandedCategoryId, setExpandedCategoryId] = useState("")

  const renderBlock = (block: CommandBlock) => {
    const BlockIcon = block.icon
    const command = block.build(fieldValues, flagValues)

    return (
      <div key={block.id} className={styles.block}>
        <div className={styles.blockHead}>
          <BlockIcon size={13} aria-hidden />
          <strong>{block.title[lang]}</strong>
          <span className={styles.spacer} />
          <button
            type="button"
            className={classnames("mini-btn", running && styles.runningBtn)}
            disabled={running || !command}
            title={command ?? block.title[lang]}
            onClick={() => command && onRun(command)}
          >
            {running ? <RefreshCw size={12} className={styles.spin} /> : <Play size={12} />}
          </button>
        </div>
        {block.fields?.map((field) => {
          const fieldKey = `${block.id}.${field.key}`
          return (
            <input
              key={field.key}
              aria-label={field.ph[lang]}
              value={fieldValues[fieldKey] ?? field.def ?? ""}
              placeholder={field.ph[lang]}
              disabled={running}
              onChange={(event) => {
                const nextValue = event.target.value
                setFieldValues((previousValues) => ({
                  ...previousValues,
                  [fieldKey]: nextValue,
                }))
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && command) onRun(command)
              }}
            />
          )
        })}
        {block.flags?.map((flag) => {
          const flagKey = `${block.id}.${flag.key}`
          return (
            <Switch
              key={flag.key}
              size="sm"
              checked={Boolean(flagValues[flagKey])}
              disabled={running}
              onChange={(checked) =>
                setFlagValues((previousValues) => ({
                  ...previousValues,
                  [flagKey]: checked,
                }))
              }
              label={flag.label[lang]}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div className={styles.blocks}>
      {categories.map((category) => {
        const categoryBlocks = blocks.filter((block) => block.cat === category.id)
        const isExpanded = expandedCategoryId === category.id

        return (
          <div key={category.id} className={styles.cat}>
            <button
              type="button"
              className={styles.catHead}
              aria-expanded={isExpanded}
              onClick={() => setExpandedCategoryId(isExpanded ? "" : category.id)}
            >
              <span>{category.title[lang]}</span>
              <span className={styles.catCount}>{categoryBlocks.length}</span>
              <ChevronDown size={13} className={isExpanded ? styles.chevOpen : undefined} />
            </button>
            {isExpanded && categoryBlocks.map(renderBlock)}
          </div>
        )
      })}
    </div>
  )
}
