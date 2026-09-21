import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react"
import classnames from "classnames"

import styles from "./style.module.scss"

type PaginationProps = {
  currentPage: number
  totalItems: number
  pageSize: number
  hasMore?: boolean
  loading?: boolean
  onPageChange: (page: number) => void
}

const WINDOW_SIZE = 5

function pageWindow(current: number, total: number): number[] {
  if (total <= 0) return []
  if (total <= WINDOW_SIZE + 2) return Array.from({ length: total }, (_, i) => i)
  const start = Math.min(Math.max(current - 2, 1), total - WINDOW_SIZE - 1)
  return Array.from({ length: WINDOW_SIZE }, (_, i) => start + i)
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  hasMore = false,
  loading = false,
  onPageChange,
}: PaginationProps) {
  const safePageSize = Math.max(1, pageSize)
  const knownTotal = Math.max(1, Math.ceil(totalItems / safePageSize))
  const totalPages = hasMore ? Math.max(knownTotal, currentPage + 2) : knownTotal
  const lastPage = totalPages - 1

  if (totalPages <= 1 && !hasMore) return null

  const visible = pageWindow(currentPage, totalPages)
  const showFirst = visible[0] !== 0
  const showLast = visible[visible.length - 1] !== lastPage
  const middle = showFirst || showLast ? visible.filter((p) => p !== 0 && p !== lastPage) : visible
  const leftSingle = visible[0] === 2
  const rightSingle = visible[visible.length - 1] === lastPage - 2
  const showLeftGap = visible[0] > 2
  const showRightGap = visible[visible.length - 1] < lastPage - 2

  const isLastPage = currentPage >= knownTotal - 1
  const canGoNext = !isLastPage || hasMore
  const atFirst = currentPage === 0
  const atLast = currentPage >= lastPage

  const goTo = (page: number) => {
    if (page !== currentPage) onPageChange(page)
  }

  const renderPage = (page: number) => (
    <button
      key={page}
      type="button"
      className={classnames("mini-btn", styles.pageBtn, page === currentPage && styles.active)}
      disabled={loading}
      onClick={() => goTo(page)}
      aria-label={`Page ${page + 1}`}
      aria-current={page === currentPage ? "page" : undefined}
    >
      {page + 1}
    </button>
  )

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button
        type="button"
        className="mini-btn"
        disabled={atFirst || loading}
        onClick={() => goTo(0)}
        aria-label="First page"
      >
        <ChevronsLeft size={14} />
      </button>
      <button
        type="button"
        className="mini-btn"
        disabled={atFirst || loading}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={14} />
      </button>
      {showFirst && renderPage(0)}
      {leftSingle && renderPage(1)}
      {showLeftGap && (
        <span className={styles.ellipsis} aria-hidden>
          …
        </span>
      )}
      {middle.map(renderPage)}
      {showRightGap && (
        <span className={styles.ellipsis} aria-hidden>
          …
        </span>
      )}
      {rightSingle && renderPage(lastPage - 1)}
      {showLast && renderPage(lastPage)}
      <button
        type="button"
        className="mini-btn"
        disabled={!canGoNext || loading}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
      >
        {loading && isLastPage ? <Loader2 size={14} className={styles.spinner} /> : <ChevronRight size={14} />}
      </button>
      <button
        type="button"
        className="mini-btn"
        disabled={atLast || loading}
        onClick={() => goTo(lastPage)}
        aria-label="Last page"
      >
        <ChevronsRight size={14} />
      </button>
    </nav>
  )
}
