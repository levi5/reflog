import classnames from "classnames"
import type { CommandSuggestionsProps } from "../../../types/components/command"
import { useTranslation } from "../../context"
import styles from "./style.module.scss"

export function CommandSuggestions({ query, suggestions }: CommandSuggestionsProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.cmdDrop} role="listbox">
      <p className={styles.cmdSection}>{query.trim() ? t("cmdTemplates") : t("cmdHistory")}</p>
      {suggestions.items.map((item, index) => (
        <button
          key={item}
          type="button"
          role="option"
          aria-selected={suggestions.activeIndex === index}
          className={classnames(styles.cmdItem, suggestions.activeIndex === index && styles.cmdActive)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => suggestions.onChoose(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}
