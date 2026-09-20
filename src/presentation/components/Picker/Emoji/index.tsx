import { useState } from "react"
import { Smile } from "lucide-react"

import { useDismiss } from "../../../hooks"
import { EMOJI_GROUPS } from "../../../../shared/constants/emoji"

import styles from "./style.module.scss"

type Props = {
  title: string
  onPick: (emoji: string) => void
}

export function EmojiPicker({ title, onPick }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))

  return (
    <div ref={ref} className={styles.root}>
      <button
        type="button"
        className={styles.toggle}
        title={title}
        aria-label={title}
        onClick={() => setOpen((o) => !o)}
      >
        <Smile size={14} />
      </button>
      {open && (
        <div className={styles.panel} role="dialog" aria-label={title}>
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label} className={styles.group}>
              {group.items.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={styles.emoji}
                  onClick={() => {
                    onPick(item)
                    setOpen(false)
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
