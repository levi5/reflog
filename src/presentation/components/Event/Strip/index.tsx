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
      {changes.map((change, changeIndex) => {
        const key =
          change.kind === "commits" || change.kind === "spotlight"
            ? `${change.kind}-${change.hashes.join(",")}`
            : change.kind === "checkout"
              ? `checkout-${change.from}-${change.to}`
              : change.kind === "files"
                ? `files-${change.files.length}`
                : `${change.kind}-${change.name}`
        const title = change.kind === "files" ? change.files.join("\n") : undefined
        return (
          <span key={key} className={styles.event} style={{ animationDelay: `${changeIndex * 140}ms` }} title={title}>
            {change.kind === "commits" && <CircleDot size={12} />}
            {change.kind === "checkout" && <GitBranch size={12} />}
            {change.kind === "ref-add" && <Plus size={12} />}
            {change.kind === "ref-move" && <ArrowRight size={12} />}
            {change.kind === "ref-del" && <Trash2 size={12} />}
            {change.kind === "spotlight" && <Eye size={12} />}
            {change.kind === "files" && <FileDiff size={12} />}
            {change.kind === "commits" &&
              `${change.hashes.length} ${t("evCommits")}: ${change.hashes.map((hash) => hash.slice(0, 7)).join(", ")}`}
            {change.kind === "checkout" && `${t("evCheckout")}: ${change.from} → ${change.to}`}
            {change.kind === "ref-add" && `${t("evRefAdd")}: ${change.name}`}
            {change.kind === "ref-move" && `${t("evRefMove")}: ${change.name}`}
            {change.kind === "ref-del" && `${t("evRefDel")}: ${change.name}`}
            {change.kind === "spotlight" && `${change.hashes.length} ${t("evSpotlight")}`}
            {change.kind === "files" && `${change.files.length} ${t("evFiles")}`}
          </span>
        )
      })}
    </div>
  )
}
