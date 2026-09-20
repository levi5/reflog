import { BookOpen, ListTree } from "lucide-react"
import { useEffect, useState } from "react"
import { Icon } from "../../components/Icons"
import { ResizableSplitLayout } from "../../components/Resizable"
import { useSettingsContext } from "../../context"
import { DOCS_CONTENT, DOCS_FIGURE_LABELS } from "../../cms/docs"
import { t } from "../../../i18n"
import styles from "./style.module.scss"

export function Docs() {
  const { lang } = useSettingsContext()
  const { intro, sections } = DOCS_CONTENT[lang]
  const fig = DOCS_FIGURE_LABELS[lang]
  const [active, setActive] = useState(sections[0].id)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: "-15% 0px -70% 0px" },
    )
    const els = DOCS_CONTENT[lang].sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null)
    els.forEach((el) => {
      observer.observe(el)
    })
    return () => observer.disconnect()
  }, [lang])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <ResizableSplitLayout
      sidebarWidth={{ initial: 210, min: 170, max: 420, storageKey: "docs.side" }}
      sidebar={
        <>
          <p className={styles.summaryTitle}>
            <ListTree size={13} />
            {t(lang, "summary")}
          </p>
          <nav className={styles.summaryNav}>
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.summaryItem + (active === s.id ? ` ${styles.active}` : "")}
                onClick={() => scrollTo(s.id)}
              >
                {s.title}
              </button>
            ))}
          </nav>
        </>
      }
      main={
        <>
          <div className={styles.docsHead}>
            <span className={styles.docsIcon}>
              <BookOpen size={18} />
            </span>
            <div>
              <h2>{t(lang, "docs")}</h2>
              <p>{intro}</p>
            </div>
          </div>
          {sections.map((s) => (
            <section key={s.id} id={s.id} className={styles.docsCard}>
              <h3>{s.title}</h3>
              {s.figure === "merge" && <Icon.Figure.MergeFlow l={fig} />}
              {s.figure === "rebase" && <Icon.Figure.RebaseFlow l={fig} />}
              {s.figure === "commit" && <Icon.Figure.CommitAnatomy l={fig} />}
              {s.figure === "template" && <Icon.Figure.TemplatePipeline l={fig} />}
              <ol>
                {s.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {s.code && <pre className={styles.code}>{s.code}</pre>}
            </section>
          ))}
        </>
      }
    />
  )
}
