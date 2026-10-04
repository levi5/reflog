import { codeHighlightUseCase } from "../../../../data"
import classnames from "classnames"
import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { memo, useMemo } from "react"
import { Fragment, jsx, jsxs } from "react/jsx-runtime"
import styles from "./style.module.scss"

interface HighlighterProps {
  text: string
  filePath?: string
  className?: string
}

export const Highlighter = memo(function Highlighter({ text, filePath = "", className }: HighlighterProps) {
  const content = useMemo(() => {
    const tree = codeHighlightUseCase.highlightLineHast(text, filePath)
    return tree ? toJsxRuntime(tree, { Fragment, jsx, jsxs }) : text
  }, [text, filePath])

  return <code className={classnames(styles.code, className)}>{content}</code>
})
