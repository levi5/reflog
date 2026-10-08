import {
  BookOpen,
  Bug,
  Cog,
  FlaskConical,
  Hammer,
  Package,
  Palette,
  Recycle,
  Rocket,
  Sparkles,
  Undo2,
  Wand2,
} from "lucide-react"
import type { CommitType } from "../../../../domain/entities/commit/commit-template"
import { SUBJECT_LIMIT } from "../../../../shared/constants/commit/commitTemplate"
import type { CommitTemplateApi } from "../../../hooks"
import { useTranslation } from "../../../context"
import { buildTemplateOptions, buildTypeOptions, handlePickTemplate } from "./options"
import { EmojiPicker } from "../../Picker/Emoji"
import { Select } from "../../Select"
import { Switch } from "../../Switch"
import styles from "./style.module.scss"

type CommitTypeExtended = CommitType | "chore" | "revert"

export const TYPE_ICONS: Record<CommitTypeExtended, typeof Sparkles> = {
  feat: Sparkles,
  fix: Bug,
  docs: BookOpen,
  style: Palette,
  refactor: Package,
  perf: Rocket,
  test: FlaskConical,
  build: Hammer,
  ci: Cog,
  chore: Recycle,
  revert: Undo2,
}

interface CommitFormProps {
  api: CommitTemplateApi
  compact?: boolean
}

function CommitTypeRow({ api }: { api: CommitTemplateApi }) {
  const { t } = useTranslation()
  const { options: templateOptions, currentValue: templateValue } = buildTemplateOptions(api)

  return (
    <div className={styles.row}>
      <Select
        label={t("commitType")}
        value={api.fields.type}
        options={buildTypeOptions(t, api.prefs.useIcons)}
        buttonClassName={styles.selectBtn}
        onChange={(nextType) => api.setField("type", nextType)}
      />
      <input
        className={styles.scope}
        aria-label={t("commitScope")}
        value={api.fields.scope}
        maxLength={24}
        placeholder={t("commitScope")}
        onChange={(event) => api.setField("scope", event.target.value)}
      />
      <label className={styles.check} title={t("breakingChange")}>
        <input
          type="checkbox"
          checked={api.fields.breaking}
          aria-label={t("breakingChange")}
          onChange={(event) => api.setField("breaking", event.target.checked)}
        />
        <span aria-hidden>!</span>
      </label>
      {api.branch && api.canInfer && (
        <button
          type="button"
          className={styles.autoBtn}
          title={`${t("autoInfer")}: ${api.branch}`}
          onClick={api.inferBranch}
        >
          <Wand2 size={13} />
        </button>
      )}
      <Select
        label={t("template")}
        value={templateValue}
        options={templateOptions}
        buttonClassName={styles.selectBtn}
        onChange={(selectedValue) => handlePickTemplate(api, selectedValue)}
      />
    </div>
  )
}

function CommitSubjectRow({ api }: { api: CommitTemplateApi }) {
  const { t } = useTranslation()
  const subjectLength = api.fields.subject.trim().length

  return (
    <div className={styles.row}>
      <label className={styles.subjectWrap}>
        <input
          aria-label={t("commitSubject")}
          value={api.fields.subject}
          placeholder={t("commitSubjectPh")}
          maxLength={120}
          onChange={(event) => api.setField("subject", event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              ;(event.target as HTMLInputElement).form?.requestSubmit()
            }
          }}
        />
        <span className={styles.counter + (subjectLength > SUBJECT_LIMIT ? ` ${styles.over}` : "")}>
          {subjectLength}/{SUBJECT_LIMIT}
        </span>
      </label>
      <EmojiPicker
        title={t("emojiPicker")}
        onPick={(emoji) => api.setField("subject", `${api.fields.subject}${emoji}`)}
      />
    </div>
  )
}

function CommitBodyFields({ api }: { api: CommitTemplateApi }) {
  const { t } = useTranslation()
  return (
    <>
      <div className={styles.row}>
        <textarea
          aria-label={t("commitBody")}
          value={api.fields.body}
          placeholder={t("commitBody")}
          rows={2}
          onChange={(event) => api.setField("body", event.target.value)}
        />
      </div>
      <div className={styles.row}>
        <input
          aria-label={t("commitFooter")}
          value={api.fields.footer}
          placeholder={t("commitFooter")}
          onChange={(event) => api.setField("footer", event.target.value)}
        />
      </div>
      <div className={styles.row}>
        <input
          aria-label={t("commitCoauthor")}
          value={api.fields.coauthor}
          placeholder={t("commitCoauthor")}
          onChange={(event) => api.setField("coauthor", event.target.value)}
        />
      </div>
      <div className={styles.row}>
        <Switch
          size="sm"
          checked={api.fields.signoff}
          onChange={(value) => api.setField("signoff", value)}
          label={t("commitSignoff")}
          ariaLabel={t("commitSignoff")}
          title={t("commitSignoffHint")}
        />
        <Switch
          size="sm"
          checked={api.fields.sign}
          onChange={(value) => api.setField("sign", value)}
          label={t("commitSign")}
          ariaLabel={t("commitSign")}
          title={t("commitSignHint")}
        />
      </div>
    </>
  )
}

const HISTORY_PREVIEW_LIMIT = 8
const HISTORY_LABEL_LIMIT = 80

function CommitHistory({ api }: { api: CommitTemplateApi }) {
  const { t } = useTranslation()
  if (api.history.length === 0) return null

  return (
    <details className={styles.history}>
      <summary>{t("commitHistory")}</summary>
      <ul>
        {api.history.slice(0, HISTORY_PREVIEW_LIMIT).map((historyEntry) => (
          <li key={historyEntry}>
            <button type="button" onClick={() => api.applyHistory(historyEntry)} title={historyEntry}>
              {historyEntry.length > HISTORY_LABEL_LIMIT
                ? `${historyEntry.slice(0, HISTORY_LABEL_LIMIT)}…`
                : historyEntry}
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}

function CommitErrors({ api }: { api: CommitTemplateApi }) {
  const { t } = useTranslation()
  if (api.errors.length === 0) return null

  return (
    <p className={styles.errors} role="alert">
      {api.errors.map((errorCode) => t(`err_${errorCode}`)).join(" · ")}
    </p>
  )
}

export function CommitForm({ api, compact = false }: CommitFormProps) {
  const { t } = useTranslation()
  const showBodyFields = api.showBody || compact

  return (
    <div className={styles.form}>
      <CommitTypeRow api={api} />
      <CommitSubjectRow api={api} />

      {!compact && (
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={showBodyFields}
          aria-controls={showBodyFields ? "commit-body-fields" : undefined}
          onClick={() => api.setShowBody((visible) => !visible)}
        >
          {api.showBody ? t("commitCollapse") : t("commitExpand")}
        </button>
      )}

      {showBodyFields && (
        <div id="commit-body-fields">
          <CommitBodyFields api={api} />
        </div>
      )}
      <CommitHistory api={api} />
      <CommitErrors api={api} />
    </div>
  )
}
