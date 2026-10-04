import { useReveal } from "../../hooks/useReveal"

import "./styles.css"

export interface ScreenshotProps {
  src: string
  alt: string
  caption?: string
  span?: "full" | "half"
  eager?: boolean
}

export const Screenshot = ({ src, alt, caption, span = "half", eager = false }: ScreenshotProps) => {
  const { ref, revealClassName } = useReveal<HTMLElement>()
  return (
    <figure ref={ref} className={`screenshot screenshot--${span} ${revealClassName}`}>
      <div className="screenshot__frame">
        <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" />
      </div>
      {caption ? <figcaption className="screenshot__caption">{caption}</figcaption> : null}
    </figure>
  )
}
