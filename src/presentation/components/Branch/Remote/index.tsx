import { Cloud, Trash2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "../../../context"
import type { RemoteInfo } from "../../../../types"
import { InlineForm } from "../../Form/Inline"
import { ListItem } from "../../List/Item"
import styles from "./style.module.scss"

interface RemotePanelProps {
  remotes: RemoteInfo[]
  onAdd: (remoteName: string, remoteUrl: string) => void
  onRemove: (remoteName: string) => void
}

interface RemoteCreateFormProps {
  remoteName: string
  remoteUrl: string
  onRemoteNameChange: (remoteName: string) => void
  onRemoteUrlChange: (remoteUrl: string) => void
  onSubmit: () => void
}

function RemoteCreateForm({
  remoteName,
  remoteUrl,
  onRemoteNameChange,
  onRemoteUrlChange,
  onSubmit,
}: RemoteCreateFormProps) {
  const { t } = useTranslation()
  return (
    <InlineForm
      onSubmit={onSubmit}
      submitLabel={t("addRemote")}
      submitIcon={<Cloud size={14} />}
      disabled={!remoteName.trim() || !remoteUrl.trim()}
    >
      <input
        aria-label={t("remoteName")}
        placeholder={t("remoteName")}
        value={remoteName}
        onChange={(event) => onRemoteNameChange(event.target.value)}
      />
      <input
        aria-label={t("remoteUrlPh")}
        placeholder={t("remoteUrlPh")}
        value={remoteUrl}
        onChange={(event) => onRemoteUrlChange(event.target.value)}
      />
    </InlineForm>
  )
}

interface RemoteCardProps {
  remote: RemoteInfo
  onRemove: (remoteName: string) => void
}

function RemoteCard({ remote, onRemove }: RemoteCardProps) {
  const { t } = useTranslation()
  return (
    <ListItem
      title={
        <>
          <Cloud size={13} /> {remote.name}
        </>
      }
      description={remote.url}
      actions={
        <button type="button" className="mini-btn" title={t("removeRemote")} onClick={() => onRemove(remote.name)}>
          <Trash2 size={12} />
        </button>
      }
    />
  )
}

export function RemotePanel({ remotes, onAdd, onRemove }: RemotePanelProps) {
  const [remoteName, setRemoteName] = useState("")
  const [remoteUrl, setRemoteUrl] = useState("")

  const handleAddRemote = () => {
    const trimmedName = remoteName.trim()
    const trimmedUrl = remoteUrl.trim()
    if (!trimmedName || !trimmedUrl) return
    onAdd(trimmedName, trimmedUrl)
    setRemoteName("")
    setRemoteUrl("")
  }

  return (
    <div className={styles.stack}>
      <RemoteCreateForm
        remoteName={remoteName}
        remoteUrl={remoteUrl}
        onRemoteNameChange={setRemoteName}
        onRemoteUrlChange={setRemoteUrl}
        onSubmit={handleAddRemote}
      />
      {remotes.map((remote) => (
        <RemoteCard key={remote.name} remote={remote} onRemove={onRemove} />
      ))}
    </div>
  )
}
