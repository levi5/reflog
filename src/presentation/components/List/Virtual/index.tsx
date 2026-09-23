import classnames from "classnames"
import { Pagination } from "../../Pagination"
import { useTranslation } from "../../../context"
import type { ReactNode } from "react"
import styles from "./style.module.scss"

export interface VirtualListProps<T> {
  items: T[]
  selectedId: string | null
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  getItemId: (item: T) => string
  renderItem: (item: T, isSelected: boolean) => ReactNode
  emptyState?: ReactNode
  header?: ReactNode
  itemClassName?: string
  listClassName?: string
}

export function VirtualList<T>({
  items,
  selectedId,
  currentPage,
  pageSize,
  onPageChange,
  getItemId,
  renderItem,
  emptyState,
  header,
  itemClassName,
  listClassName,
}: VirtualListProps<T>) {
  const { t } = useTranslation()
  const start = currentPage * pageSize
  const visibleItems = items.slice(start, start + pageSize)
  const totalPages = Math.ceil(items.length / pageSize)

  return (
    <div className={classnames(styles.virtualList, listClassName)}>
      {header && <div className={styles.listHeader}>{header}</div>}
      {items.length === 0 ? (
        (emptyState ?? (
          <div className={styles.emptyState}>
            <p>{t("noItems")}</p>
          </div>
        ))
      ) : (
        <>
          <ul className={styles.listBody} aria-label={t("items")}>
            {visibleItems.map((item) => {
              const itemId = getItemId(item)
              return (
                <li
                  key={itemId}
                  className={classnames(styles.listItem, itemClassName, itemId === selectedId && styles.selected)}
                >
                  {renderItem(item, itemId === selectedId)}
                </li>
              )
            })}
          </ul>
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalItems={items.length}
              pageSize={pageSize}
              onPageChange={onPageChange}
            />
          )}
        </>
      )}
    </div>
  )
}
