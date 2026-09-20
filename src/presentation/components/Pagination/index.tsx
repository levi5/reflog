import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

import styles from "./style.module.scss"

type PaginationProps = {
  currentPage: number
  totalItems: number
  pageSize: number
  hasMore?: boolean
  loading?: boolean
  onPageChange: (page: number) => void
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  hasMore = false,
  loading = false,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  if (totalPages <= 1 && !hasMore) return null

  const isLastPage = currentPage >= totalPages - 1
  const canGoNext = !isLastPage || hasMore

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button
        type="button"
        className="mini-btn"
        disabled={currentPage === 0 || loading}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={14} />
      </button>
      <span>
        {currentPage + 1} / {totalPages}
        {hasMore ? "+" : ""}
      </span>
      <button
        type="button"
        className="mini-btn"
        disabled={!canGoNext || loading}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
      >
        {loading && isLastPage ? <Loader2 size={14} className={styles.spinner} /> : <ChevronRight size={14} />}
      </button>
    </nav>
  )
}
