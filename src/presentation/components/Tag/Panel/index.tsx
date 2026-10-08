import { semverUseCase } from "../../../../data"
import { ArrowUpCircle, ArrowUpFromLine, Tag, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "../../../context"

import { InlineForm } from "../../Form/Inline"
import { ListItem } from "../../List/Item"
import { Switch } from "../../Switch"
import styles from "./style.module.scss"

const INITIAL_VERSION = "v0.1.0"

type TagPanelProps = {
  tags: string[]
  onCreateTag: (tagName: string, tagMessage?: string, signed?: boolean) => void
  onDeleteTag: (tagName: string) => void
  onPushTag?: (tagName: string) => void
  busy?: boolean
}

type VersionSuggestionProps = {
  existingTags: string[]
  onPickVersion: (version: string) => void
}

const VersionSuggestion = ({ existingTags, onPickVersion }: VersionSuggestionProps) => {
  const { t } = useTranslation()
  const nextVersions = useMemo(() => semverUseCase.suggestNextVersions(existingTags), [existingTags])

  const versionOptions = nextVersions ? [nextVersions.patch, nextVersions.minor, nextVersions.major] : [INITIAL_VERSION]

  return (
    <div className={styles.suggest}>
      <span className={styles.suggestLabel}>
        <ArrowUpCircle size={12} />
        {t("nextVersion")}
        {nextVersions && `: ${nextVersions.base}`}
      </span>
      <span className={styles.chips}>
        {versionOptions.map((version) => (
          <button
            key={version}
            type="button"
            className="mini-btn"
            title={version}
            onClick={() => onPickVersion(version)}
          >
            {version}
          </button>
        ))}
      </span>
    </div>
  )
}

interface TagCreateFormProps {
  tagName: string
  tagMessage: string
  tagSigned: boolean
  onTagNameChange: (tagName: string) => void
  onTagMessageChange: (tagMessage: string) => void
  onTagSignedChange: (signed: boolean) => void
  onSubmit: () => void
}

function TagCreateForm({
  tagName,
  tagMessage,
  tagSigned,
  onTagNameChange,
  onTagMessageChange,
  onTagSignedChange,
  onSubmit,
}: TagCreateFormProps) {
  const { t } = useTranslation()
  return (
    <InlineForm
      onSubmit={onSubmit}
      submitLabel={t("createTag")}
      submitIcon={<Tag size={14} />}
      disabled={!tagName.trim()}
      details={
        <>
          <input
            aria-label={t("tagMsg")}
            placeholder={t("tagMsg")}
            value={tagMessage}
            onChange={(event) => onTagMessageChange(event.target.value)}
          />
          <Switch
            size="sm"
            checked={tagSigned}
            onChange={onTagSignedChange}
            label={t("tagSign")}
            ariaLabel={t("tagSign")}
            title={t("tagSignHint")}
          />
        </>
      }
    >
      <input
        aria-label={t("newTag")}
        placeholder={t("newTag")}
        value={tagName}
        onChange={(event) => onTagNameChange(event.target.value)}
      />
    </InlineForm>
  )
}

interface TagCardProps {
  tagName: string
  onDeleteTag: (tagName: string) => void
  onPushTag?: (tagName: string) => void
  busy?: boolean
}

function TagCard({ tagName, onDeleteTag, onPushTag, busy = false }: TagCardProps) {
  const { t } = useTranslation()
  return (
    <ListItem
      title={
        <>
          <Tag size={13} /> {tagName}
        </>
      }
      actions={
        <>
          {onPushTag && (
            <button
              type="button"
              className="mini-btn"
              title={t("pushTag")}
              aria-label={`${t("pushTag")}: ${tagName}`}
              disabled={busy}
              onClick={() => onPushTag(tagName)}
            >
              <ArrowUpFromLine size={12} />
            </button>
          )}
          <button
            type="button"
            className="mini-btn"
            title={t("deleteTag")}
            aria-label={`${t("deleteTag")}: ${tagName}`}
            disabled={busy}
            onClick={() => onDeleteTag(tagName)}
          >
            <Trash2 size={12} />
          </button>
        </>
      }
    />
  )
}

export function TagPanel({ tags, onCreateTag, onDeleteTag, onPushTag, busy = false }: TagPanelProps) {
  const [tagName, setTagName] = useState("")
  const [tagMessage, setTagMessage] = useState("")
  const [tagSigned, setTagSigned] = useState(false)

  const handleCreateTag = () => {
    const trimmedName = tagName.trim()
    if (!trimmedName) return
    onCreateTag(trimmedName, tagMessage.trim() || undefined, tagSigned)
    setTagName("")
    setTagMessage("")
    setTagSigned(false)
  }

  const handlePickVersion = (version: string) => {
    setTagName(version)
    setTagMessage((currentMessage) => (currentMessage.trim() ? currentMessage : version))
  }

  return (
    <div className={styles.stack}>
      <VersionSuggestion existingTags={tags} onPickVersion={handlePickVersion} />
      <TagCreateForm
        tagName={tagName}
        tagMessage={tagMessage}
        tagSigned={tagSigned}
        onTagNameChange={setTagName}
        onTagMessageChange={setTagMessage}
        onTagSignedChange={setTagSigned}
        onSubmit={handleCreateTag}
      />
      {tags.map((tagName) => (
        <TagCard key={tagName} tagName={tagName} busy={busy} onDeleteTag={onDeleteTag} onPushTag={onPushTag} />
      ))}
    </div>
  )
}
