import { ArrowRight, CircleDot, Eye, FileDiff, GitBranch, Plus, Trash2 } from "lucide-react"
import type { GraphChange } from "../../../../domain/entities/graph/graph-anim"
import { useTranslation } from "../../../context"

import styles from "./style.module.scss"

interface Props {
  changes: GraphChange[]
}

export function EventsStrip({ changes }: Props) {
  const { t } = useTranslation()

  if (changes.length === 0) return null

  return (
    <div className={styles.events}>
      <span className={styles.eventsTitle}>{t("eventsTitle")}</span>
      {changes.map((c, i) => {
        const key =
          c.kind === "commits" || c.kind === "spotlight"
            ? `${c.kind}-${c.hashes.join(",")}`
            : c.kind === "checkout"
              ? `checkout-${c.from}-${c.to}`
              : c.kind === "files"
                ? `files-${c.files.length}`
                : `${c.kind}-${c.name}`
        const title = c.kind === "files" ? c.files.join("\n") : undefined
        return (
          <span key={key} className={styles.event} style={{ animationDelay: `${i * 140}ms` }} title={title}>
            {c.kind === "commits" && <CircleDot size={12} />}
            {c.kind === "checkout" && <GitBranch size={12} />}
            {c.kind === "ref-add" && <Plus size={12} />}
            {c.kind === "ref-move" && <ArrowRight size={12} />}
            {c.kind === "ref-del" && <Trash2 size={12} />}
            {c.kind === "spotlight" && <Eye size={12} />}
            {c.kind === "files" && <FileDiff size={12} />}
            {c.kind === "commits" &&
              `${c.hashes.length} ${t("evCommits")}: ${c.hashes.map((h) => h.slice(0, 7)).join(", ")}`}
            {c.kind === "checkout" && `${t("evCheckout")}: ${c.from} → ${c.to}`}
            {c.kind === "ref-add" && `${t("evRefAdd")}: ${c.name}`}
            {c.kind === "ref-move" && `${t("evRefMove")}: ${c.name}`}
            {c.kind === "ref-del" && `${t("evRefDel")}: ${c.name}`}
            {c.kind === "spotlight" && `${c.hashes.length} ${t("evSpotlight")}`}
            {c.kind === "files" && `${c.files.length} ${t("evFiles")}`}
          </span>
        )
      })}
    </div>
  )
}
