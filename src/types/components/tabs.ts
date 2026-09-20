import type { ReactNode } from "react"

export type TabsVariant = "segmented" | "pills" | "underline" | "subtle"
export type TabsSize = "sm" | "md" | "lg"
export type TabsOrientation = "horizontal" | "vertical"

export interface TabItem<T extends string = string> {
  id: T
  label?: ReactNode
  icon?: ReactNode
  badge?: ReactNode
  count?: number
  alert?: boolean
  disabled?: boolean
  title?: string
  className?: string
}

export interface TabsContextValue {
  value: string
  onChange: (value: string) => void
  variant: TabsVariant
  size: TabsSize
  orientation: TabsOrientation
  fullWidth: boolean
  baseId: string
}

export interface TabsProps<T extends string = string> {
  value?: T
  defaultValue?: T
  onChange?: (value: T) => void
  items?: readonly TabItem<T>[] | TabItem<T>[]
  variant?: TabsVariant
  size?: TabsSize
  orientation?: TabsOrientation
  fullWidth?: boolean
  className?: string
  listClassName?: string
  ariaLabel?: string
  children?: ReactNode
}

export interface TabsListProps {
  className?: string
  ariaLabel?: string
  children: ReactNode
}

export interface TabProps<T extends string = string> {
  value: T
  icon?: ReactNode
  badge?: ReactNode
  count?: number
  alert?: boolean
  disabled?: boolean
  title?: string
  className?: string
  children?: ReactNode
  onClick?: () => void
}

export interface TabPanelProps<T extends string = string> {
  value: T
  className?: string
  children?: ReactNode
  keepMounted?: boolean
}
