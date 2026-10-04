export interface ScreenshotProps {
  src: string
  alt: string
  caption?: string
  span?: "full" | "half"
  eager?: boolean
}

export const Screenshot = ({ src, alt, caption, span = "half", eager = false }: ScreenshotProps) => (
  <figure className={`screenshot screenshot--${span}`}>
    <div className="screenshot__frame">
      <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" />
    </div>
    {caption ? <figcaption className="screenshot__caption">{caption}</figcaption> : null}
  </figure>
)

import "./styles.css"
