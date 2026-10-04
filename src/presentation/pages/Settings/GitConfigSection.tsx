import { RotateCcw, Save } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { gitApi } from "../../../infrastructure/git"
import { useRepoCore, useTranslation } from "../../context"
import { _Either } from "funcio"
import type { ConfigEntry } from "../../../types"
import styles from "./style.module.scss"

type Drafts = Record<string, string>

const PROFILE_MANAGED_KEYS = new Set(["user.name", "user.email"])

export function GitConfigSection() {
  const { t, format } = useTranslation()
  const repo = useRepoCore()
  const [globalScope, setGlobalScope] = useState(false)
  const [entries, setEntries] = useState<ConfigEntry[]>([])
  const [drafts, setDrafts] = useState<Drafts>({})
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const load = useCallback(
    async (global: boolean) => {
      setLoading(true)
      setError(null)
      const result = await _Either.try.async(() => gitApi.configSnapshot(repo.repo, global))
      if (result.isRight()) {
        setEntries((result.value as ConfigEntry[]).filter((entry) => !PROFILE_MANAGED_KEYS.has(entry.key)))
        setDrafts({})
      } else {
        setError(String(result.value))
        setEntries([])
      }
      setLoading(false)
    },
    [repo.repo],
  )

  useEffect(() => {
    void load(globalScope)
  }, [load, globalScope])

  const save = async (key: string) => {
    const value = drafts[key] ?? ""
    setSavingKey(key)
    setError(null)
    setStatus(null)
    const result = await _Either.try.async(() => gitApi.configSet(repo.repo, key, value, globalScope))
    if (result.isLeft()) {
      setError(String(result.value))
    } else {
      setStatus(format("gitConfigSaved", { key }))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      await load(globalScope)
    }
    setSavingKey(null)
  }

  const unset = async (key: string) => {
    setSavingKey(key)
    setError(null)
    setStatus(null)
    const result = await _Either.try.async(() => gitApi.configSet(repo.repo, key, "", globalScope))
    if (result.isLeft()) {
      setError(String(result.value))
    } else {
      setStatus(format("gitConfigUnset", { key }))
      await load(globalScope)
    }
    setSavingKey(null)
  }

  return (
    <>
      <p className={styles.miniHead}>{t("gitConfigHint")}</p>
      <p className={styles.miniHead}>{t("gitConfigIdentityNote")}</p>

      <div className={styles.scopeRow}>
        <button
          type="button"
          className={globalScope ? "mini-btn" : "mini-btn primary-t"}
          aria-pressed={!globalScope}
          disabled={loading || !repo.repo}
          onClick={() => setGlobalScope(false)}
        >
          {t("gitConfigScopeLocal")}
        </button>
        <button
          type="button"
          className={globalScope ? "mini-btn primary-t" : "mini-btn"}
          aria-pressed={globalScope}
          disabled={loading}
          onClick={() => setGlobalScope(true)}
        >
          {t("gitConfigScopeGlobal")}
        </button>
        <button
          type="button"
          className="mini-btn"
          disabled={loading}
          title={t("gitConfigReload")}
          aria-label={t("gitConfigReload")}
          onClick={() => void load(globalScope)}
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {error && (
        <p className={styles.configError} role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className={styles.configStatus} role="status">
          {status}
        </p>
      )}

      <div className={styles.configList}>
        {entries.length === 0 && !loading && <p className={styles.miniHead}>{t("gitConfigEmpty")}</p>}
        {entries.map((entry) => {
          const draft = drafts[entry.key]
          const dirty = draft !== undefined && draft !== entry.value
          const inputId = `config-${entry.key}`
          return (
            <div key={entry.key} className={styles.configRow}>
              <label htmlFor={inputId} className={styles.configKey}>
                {entry.key}
              </label>
              <input
                id={inputId}
                value={draft ?? entry.value}
                placeholder={t("gitConfigUnsetPlaceholder")}
                aria-label={entry.key}
                onChange={(event) => setDrafts((prev) => ({ ...prev, [entry.key]: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && dirty) void save(entry.key)
                }}
              />
              <button
                type="button"
                className="mini-btn"
                disabled={!dirty || savingKey === entry.key}
                onClick={() => void save(entry.key)}
                title={t("gitConfigSave")}
                aria-label={`${t("gitConfigSave")}: ${entry.key}`}
              >
                <Save size={13} />
              </button>
              <button
                type="button"
                className="mini-btn"
                disabled={entry.value.trim() === "" || savingKey === entry.key}
                onClick={() => void unset(entry.key)}
                title={t("gitConfigUnset")}
                aria-label={`${t("gitConfigUnset")}: ${entry.key}`}
              >
                {t("gitConfigUnsetShort")}
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}
