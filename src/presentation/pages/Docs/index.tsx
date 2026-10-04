import { BookOpen, ListTree } from "lucide-react"
import { Fragment, useState } from "react"

import { Icon } from "../../components/Icons"
import { ResizableSplitLayout } from "../../components/Resizable"

import { useSettingsContext } from "../../context"
import { scrollIntoViewSafely, useIntersectionObserver } from "../../hooks"
import { DOCS_CONTENT, DOCS_FIGURE_LABELS } from "../../cms/docs"
import { t } from "../../../i18n"

import styles from "./style.module.scss"

export const Docs = () => {
  const { lang } = useSettingsContext()
  const { intro, sections } = DOCS_CONTENT[lang]
  const fig = DOCS_FIGURE_LABELS[lang]
  const [active, setActive] = useState(sections[0].id)

  const observeSection = useIntersectionObserver<HTMLElement>(
    (entries) => {
      const activeEntry = entries.find((entry) => entry.isIntersecting)
      if (activeEntry) setActive(activeEntry.target.id)
    },
    { rootMargin: "-15% 0px -70% 0px" },
  )

  const scrollTo = (id: string) => {
    scrollIntoViewSafely(document.getElementById(id), { block: "start" })
  }

  return (
    <ResizableSplitLayout
      sidebarWidth={{ initial: 250, min: 200, max: 420, storageKey: "docs.side", label: t(lang, "resizeSidebar") }}
      sidebar={
        <Fragment>
          <p className={styles.summaryTitle}>
            <ListTree size={13} />
            {t(lang, "summary")}
          </p>
          <nav className={styles.summaryNav}>
            {sections.map(({ id, title }) => (
              <button
                key={id}
                type="button"
                className={styles.summaryItem + (active === id ? ` ${styles.active}` : "")}
                onClick={() => scrollTo(id)}
              >
                {title}
              </button>
            ))}
          </nav>
        </Fragment>
      }
      main={
        <Fragment>
          <div className={styles.docsHead}>
            <span className={styles.docsIcon}>
              <BookOpen size={18} />
            </span>
            <div>
              <h2>{t(lang, "docs")}</h2>
              <p>{intro}</p>
            </div>
          </div>
          {sections.map(({ id, title, figure, code, steps }) => (
            <section key={id} ref={observeSection} id={id} className={styles.docsCard}>
              <h3>{title}</h3>
              {figure === "merge" && <Icon.Figure.MergeFlow l={fig} />}
              {figure === "rebase" && <Icon.Figure.RebaseFlow l={fig} />}
              {figure === "commit" && <Icon.Figure.CommitAnatomy l={fig} />}
              {figure === "template" && <Icon.Figure.TemplatePipeline l={fig} />}
              <ol>
                {steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {code && <pre className={styles.code}>{code}</pre>}
            </section>
          ))}
        </Fragment>
      }
    />
  )
}
