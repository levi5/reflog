import { Search } from "lucide-react"
import type { KeyboardEvent, RefObject } from "react"
import styles from "./search.module.scss"

interface SearchFieldProps {
  value: string
  inputRef: RefObject<HTMLInputElement | null>
  label: string
  onChange: (value: string) => void
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
}

export function SearchField({ value, inputRef, label, onChange, onKeyDown }: SearchFieldProps) {
  return (
    <div className={styles.searchBox}>
      <Search size={16} className={styles.searchIcon} aria-hidden />
      <input
        ref={inputRef}
        type="search"
        placeholder={label}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}
