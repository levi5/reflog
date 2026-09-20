import { ArrowUpCircle, Tag, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "../../../context"

import { suggestNextVersions } from "../../../../main/adapters"
import { InlineForm } from "../../Form/Inline"
import { ListItem } from "../../List/Item"
import styles from "./style.module.scss"

const INITIAL_VERSION = "v0.1.0"

type TagPanelProps = {
  tags: string[]
  onCreateTag: (tagName: string, tagMessage?: string) => void
  onDeleteTag: (tagName: string) => void
}

type VersionSuggestionProps = {
  existingTags: string[]
  onPickVersion: (version: string) => void
}

const VersionSuggestion = ({ existingTags, onPickVersion }: VersionSuggestionProps) => {
  const { t } = useTranslation()
  const nextVersions = useMemo(() => suggestNextVersions(existingTags), [existingTags])

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
  onTagNameChange: (tagName: string) => void
  onTagMessageChange: (tagMessage: string) => void
  onSubmit: () => void
}

function TagCreateForm({ tagName, tagMessage, onTagNameChange, onTagMessageChange, onSubmit }: TagCreateFormProps) {
  const { t } = useTranslation()
  return (
    <InlineForm
      onSubmit={onSubmit}
      submitLabel={t("createTag")}
      submitIcon={<Tag size={14} />}
      disabled={!tagName.trim()}
      details={
        <input
          aria-label={t("tagMsg")}
          placeholder={t("tagMsg")}
          value={tagMessage}
          onChange={(event) => onTagMessageChange(event.target.value)}
        />
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
}

function TagCard({ tagName, onDeleteTag }: TagCardProps) {
  const { t } = useTranslation()
  return (
    <ListItem
      title={
        <>
          <Tag size={13} /> {tagName}
        </>
      }
      actions={
        <button type="button" className="mini-btn" title={t("deleteTag")} onClick={() => onDeleteTag(tagName)}>
          <Trash2 size={12} />
        </button>
      }
    />
  )
}

export function TagPanel({ tags, onCreateTag, onDeleteTag }: TagPanelProps) {
  const [tagName, setTagName] = useState("")
  const [tagMessage, setTagMessage] = useState("")

  const handleCreateTag = () => {
    const trimmedName = tagName.trim()
    if (!trimmedName) return
    onCreateTag(trimmedName, tagMessage.trim() || undefined)
    setTagName("")
    setTagMessage("")
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
        onTagNameChange={setTagName}
        onTagMessageChange={setTagMessage}
        onSubmit={handleCreateTag}
      />
      {tags.map((tagName) => (
        <TagCard key={tagName} tagName={tagName} onDeleteTag={onDeleteTag} />
      ))}
    </div>
  )
}
