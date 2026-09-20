import type { ReactNode, HTMLAttributes } from "react"
import classnames from "classnames"

import styles from "./styles.module.scss"

interface FlexRowProps extends HTMLAttributes<HTMLDivElement> {
  gap?: number
  align?: "start" | "center" | "end" | "stretch"
  justify?: "start" | "center" | "end" | "between" | "around"
  wrap?: boolean
  children: ReactNode
}

export function FlexRow({
  gap = 8,
  align = "stretch",
  justify = "start",
  wrap = false,
  children,
  className,
  style,
  ...rest
}: FlexRowProps) {
  return (
    <div
      className={classnames(styles.row, className)}
      style={
        {
          ...style,
          "--flex-gap": `${gap}px`,
          "--flex-align": align,
          "--flex-justify": justify,
          "--flex-wrap": wrap ? "wrap" : "nowrap",
        } as React.CSSProperties
      }
      {...rest}
    >
      {children}
    </div>
  )
}

interface FlexColProps extends HTMLAttributes<HTMLDivElement> {
  gap?: number
  align?: "start" | "center" | "end" | "stretch"
  justify?: "start" | "center" | "end" | "between" | "around"
  grow?: number
  children: ReactNode
}

export function FlexCol({
  gap = 8,
  align = "stretch",
  justify = "start",
  grow = 0,
  children,
  className,
  style,
  ...rest
}: FlexColProps) {
  return (
    <div
      className={classnames(styles.col, className)}
      style={
        {
          ...style,
          "--flex-gap": `${gap}px`,
          "--flex-align": align,
          "--flex-justify": justify,
          "--flex-grow": grow,
        } as React.CSSProperties
      }
      {...rest}
    >
      {children}
    </div>
  )
}

export const Flex = {
  Row: FlexRow,
  Col: FlexCol,
}
