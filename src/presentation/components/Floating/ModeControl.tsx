import { isTauri, invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useEffect, useState } from "react"
import { useTranslation } from "../../context"
import { Switch } from "../Switch"

export function FloatingModeControl() {
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(false)
  const [pending, setPending] = useState(true)
  const [error, setError] = useState("")
  const desktop = isTauri()

  useEffect(() => {
    if (!desktop) return
    let active = true
    let changed = false
    void invoke<boolean>("floating_enabled")
      .then((value) => {
        if (active && !changed) setEnabled(value)
      })
      .catch((e) => {
        if (active && !changed) setError(String(e))
      })
      .finally(() => {
        if (active) setPending(false)
      })
    const unlisten = listen<boolean>("floating-mode-changed", ({ payload }) => {
      if (!active) return
      changed = true
      setEnabled(payload)
      setError("")
    }).catch((e) => {
      if (active) setError(String(e))
    })
    return () => {
      active = false
      void unlisten.then((stop) => stop?.()).catch(console.error)
    }
  }, [desktop])

  async function toggle(next: boolean) {
    setPending(true)
    setError("")
    try {
      await invoke("set_floating_mode", { enabled: next })
      setEnabled(next)
    } catch (e) {
      setError(String(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Switch
        checked={enabled}
        onChange={(next) => void toggle(next)}
        disabled={!desktop || pending}
        ariaLabel={t("floatingMode")}
        title={desktop ? "Ctrl+Shift+Space" : t("floatingDesktopOnly")}
      />
      {error && (
        <span role="alert">
          {t("floatingError")}: {error}
        </span>
      )}
    </>
  )
}
