import classnames from "classnames"
import { Search as SearchIcon, X } from "lucide-react"
import { useSearch, useTranslation } from "../../../context"

import styles from "./styles.module.scss"

export interface SearchBoxProps {
  className?: string
  placeholder?: string
}

export function SearchBox({ className, placeholder }: SearchBoxProps) {
  const { t } = useTranslation()
  const { query, setQuery } = useSearch()

  return (
    <div className={classnames(styles.searchBox, className)}>
      <SearchIcon size={13} className={styles.searchIcon} />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder ?? t("searchPh")}
      />
      {query && (
        <button
          type="button"
          className={styles.clearBtn}
          onClick={() => setQuery("")}
          title={t("clear")}
          aria-label={t("clear")}
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}
