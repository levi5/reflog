import classnames from "classnames"
import { useMemo } from "react"
import { buildDiffPreviewLines } from "../../../../data/use-cases/diff/preview-lines"
import { Highlighter } from "../../Code/Highlighter"
import styles from "./style.module.scss"

interface DiffPreviewProps {
  content: string
  filePath?: string
  label: string
  className?: string
}

export function DiffPreview({ content, filePath, label, className }: DiffPreviewProps) {
  const lines = useMemo(() => buildDiffPreviewLines(content, filePath), [content, filePath])

  return (
    <section className={classnames(styles.preview, className)} aria-label={label}>
      <div className={styles.lines}>
        {lines.map((line) => (
          <div key={line.index} className={classnames(styles.line, styles[line.kind])}>
            {line.kind === "meta" || line.kind === "hunk" ? (
              <span className={styles.heading}>{line.text || " "}</span>
            ) : (
              <>
                <span className={styles.number} aria-hidden="true">
                  {line.oldLine}
                </span>
                <span className={styles.number} aria-hidden="true">
                  {line.newLine}
                </span>
                <span className={styles.prefix}>{line.prefix}</span>
                <Highlighter text={line.text || " "} filePath={line.filePath} className={styles.content} />
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
