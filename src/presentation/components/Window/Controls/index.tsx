import { getCurrentWindow, type Window as TauriWindow } from "@tauri-apps/api/window"
import classnames from "classnames"
import { Minus, Square, X } from "lucide-react"
import styles from "./style.module.scss"

type Action = "minimize" | "toggleMaximize" | "close"

const ACTIONS: Record<Action, (w: TauriWindow) => Promise<void>> = {
  minimize: (w) => w.minimize(),
  toggleMaximize: (w) => w.toggleMaximize(),
  close: (w) => w.close(),
}

const BUTTONS: { action: Action; close: boolean; Icon: typeof X }[] = [
  { action: "minimize", close: false, Icon: Minus },
  { action: "toggleMaximize", close: false, Icon: Square },
  { action: "close", close: true, Icon: X },
]

const run = (action: Action) => () => {
  try {
    ACTIONS[action](getCurrentWindow()).catch(() => undefined)
  } catch {
    return
  }
}

export function WindowControls() {
  return (
    <div className={styles.controls}>
      {BUTTONS.map(({ action, close, Icon }) => (
        <button
          type="button"
          key={action}
          className={classnames(styles.btn, close && styles.close)}
          onClick={run(action)}
          aria-label={action}
          title={action}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  )
}
