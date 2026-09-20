import classnames from "classnames"
import { Pagination } from "../../Pagination"
import type { ReactNode, KeyboardEvent } from "react"
import styles from "./style.module.scss"

export interface ListAction {
  label: string
  onClick: () => void
  icon?: ReactNode
  disabled?: boolean
  variant?: "default" | "danger"
  ariaLabel?: string
}

export interface VirtualListProps<T> {
  items: T[]
  selectedId: string | null
  currentPage: number
  pageSize: number
  onPageChange: (page: number) => void
  onSelect: (id: string) => void
  onAction?: (id: string, action: string) => void
  isRunning?: boolean
  getItemId: (item: T) => string
  renderItem: (item: T, isSelected: boolean, actions: ListAction[]) => ReactNode
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
  onSelect,
  onAction,
  isRunning = false,
  getItemId,
  renderItem,
  emptyState,
  header,
  itemClassName,
  listClassName,
}: VirtualListProps<T>) {
  const start = currentPage * pageSize
  const visibleItems = items.slice(start, start + pageSize)
  const totalPages = Math.ceil(items.length / pageSize)

  const buildActions = (itemId: string): ListAction[] => {
    if (!onAction) return []
    return [
      {
        label: "Run",
        onClick: () => onAction(itemId, "run"),
        disabled: isRunning,
        ariaLabel: "Run",
      },
      {
        label: "Delete",
        onClick: () => onAction(itemId, "delete"),
        variant: "danger",
        ariaLabel: "Delete",
      },
    ]
  }

  const handleItemClick = (itemId: string) => onSelect(itemId)

  const handleItemKeyDown = (event: KeyboardEvent<HTMLLIElement>, itemId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleItemClick(itemId)
    }
  }

  return (
    <div className={classnames(styles.virtualList, listClassName)}>
      {header && <div className={styles.listHeader}>{header}</div>}
      {items.length === 0 ? (
        (emptyState ?? (
          <div className={styles.emptyState}>
            <p>No items</p>
          </div>
        ))
      ) : (
        <>
          <ul className={styles.listBody} aria-label="Items">
            {visibleItems.map((item, index) => {
              const itemId = getItemId(item)
              const isSelected = itemId === selectedId
              return (
                <li
                  key={itemId}
                  className={classnames(styles.listItem, itemClassName, isSelected && styles.selected)}
                  tabIndex={index}
                  onClick={() => handleItemClick(itemId)}
                  onKeyDown={(e) => handleItemKeyDown(e, itemId)}
                >
                  {renderItem(item, isSelected, buildActions(itemId))}
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
