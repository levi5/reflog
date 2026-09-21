import { Bot, FileText, ListChecks, Zap, type LucideIcon } from "lucide-react"
import classnames from "classnames"
import { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
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

const SECTION_PAGES: Record<Section, typeof Automations> = {
  recipes: Automations,
  monitors: Monitors,
  templates: Templates,
}

function toSection(raw: string | null | undefined): Section {
  return raw === "monitors" || raw === "templates" || raw === "recipes" ? raw : "recipes"
}

export function AutomationHub() {
  const { lang } = useSettingsContext()
  const { section: sectionParam } = useParams<{ section?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionParamValue = sectionParam ?? searchParams.get("section")
  const [section, setSection] = useState<Section>(() => toSection(sectionParamValue))
  const [mountedSections, setMountedSections] = useState<Section[]>(() => [section])
  const copy = AUTOMATION_HUB_COPY[lang]
  const currentSection = copy.sections[section]

  useEffect(() => {
    const fromUrl = toSection(sectionParamValue)
    setSection((prev) => (prev === fromUrl ? prev : fromUrl))
    setMountedSections((prev) => (prev.includes(fromUrl) ? prev : [...prev, fromUrl]))
  }, [sectionParamValue])

  const handleSectionChange = (next: Section) => {
    setSection(next)
    setMountedSections((prev) => (prev.includes(next) ? prev : [...prev, next]))
    setSearchParams((prev) => {
      const nextSearchParams = new URLSearchParams(prev)
      nextSearchParams.set("section", next)
      return nextSearchParams
    })
  }

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
          onChange={handleSectionChange}
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
        {AUTOMATION_HUB_SECTION_IDS.filter((sectionId) => mountedSections.includes(sectionId)).map((sectionId) => {
          const Page = SECTION_PAGES[sectionId]
          return (
            <div key={sectionId} className={classnames(styles.panel, sectionId !== section && styles.hidden)}>
              <Page />
            </div>
          )
        })}
      </div>
    </section>
  )
}
