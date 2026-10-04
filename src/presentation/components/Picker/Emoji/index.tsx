import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react"
import { Smile } from "lucide-react"

import { useDismiss } from "../../../hooks"
import { EMOJI_GROUPS } from "../../../../shared/constants/emoji"

import { trapFocus } from "../../../hooks/ui/useFocusTrap"
import styles from "./style.module.scss"

type Props = {
  title: string
  onPick: (emoji: string) => void
}

export function EmojiPicker({ title, onPick }: Props) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))
  useEffect(() => {
    const panel = panelRef.current
    if (!open || !panel) return
    const onKeyDown = (event: globalThis.KeyboardEvent) =>
      trapFocus(event as unknown as KeyboardEvent<HTMLDivElement>, panel)
    panel.addEventListener("keydown", onKeyDown)
    return () => panel.removeEventListener("keydown", onKeyDown)
  }, [open])

  return (
    <div ref={ref} className={styles.root}>
      <button
        type="button"
        className={styles.toggle}
        title={title}
        aria-label={title}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <Smile size={14} />
      </button>
      {open && (
        <div id={panelId} className={styles.panel} ref={panelRef}>
          {EMOJI_GROUPS.map((group) => (
            <fieldset key={group.label} className={styles.group}>
              <legend className={styles.groupLabel}>{group.label}</legend>
              {group.items.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={styles.emoji}
                  aria-label={item}
                  onClick={() => {
                    onPick(item)
                    setOpen(false)
                  }}
                >
                  {item}
                </button>
              ))}
            </fieldset>
          ))}
        </div>
      )}
    </div>
  )
}
