import { Bot, FileText, ListChecks, Zap, type LucideIcon } from "lucide-react"
import { type FC, useMemo, useState } from "react"
import type { TabItem } from "../../../../types/components"
import { Tabs } from "../../../components/Tabs"
import { useSettingsContext } from "../../../context"
import {
  AUTOMATION_HUB_COPY,
  AUTOMATION_HUB_SECTION_IDS,
  type AutomationHubSection as Section,
} from "../../../cms/automationHub"
import { Automations } from ".."
import { Monitors } from "../../Monitors"
import { Templates } from "../../Templates"
import styles from "./style.module.scss"

const SECTION_ICONS: Record<Section, LucideIcon> = {
  recipes: Bot,
  monitors: ListChecks,
  templates: FileText,
}

const SECTION_PAGES: Record<Section, FC> = {
  recipes: Automations,
  monitors: Monitors,
  templates: Templates,
}

export function AutomationHub() {
  const { lang } = useSettingsContext()
  const [section, setSection] = useState<Section>("recipes")
  const copy = AUTOMATION_HUB_COPY[lang]
  const ActivePage = SECTION_PAGES[section]
  const currentSection = copy.sections[section]

  const tabItems: TabItem<Section>[] = useMemo(
    () =>
      AUTOMATION_HUB_SECTION_IDS.map((sectionId) => {
        const IconComponent = SECTION_ICONS[sectionId]
        return {
          id: sectionId,
          label: copy.sections[sectionId].label,
          icon: <IconComponent size={15} />,
        }
      }),
    [copy],
  )

  return (
    <section className={styles.page} aria-labelledby="automation-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{copy.title}</p>
          <h1 id="automation-title">{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        <Tabs<Section>
          value={section}
          onChange={setSection}
          items={tabItems}
          variant="segmented"
          size="md"
          ariaLabel={copy.title}
        />
      </header>

      <div className={styles.guide}>
        <Zap size={15} />
        <p>
          <strong>{currentSection.label}:</strong> {currentSection.hint}
        </p>
        <ol>
          {copy.steps.map((step, index) => (
            <li key={step}>
              <span>{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.content}>
        <ActivePage />
      </div>
    </section>
  )
}
