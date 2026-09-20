import { UserPlus, UserRound } from "lucide-react"
import { useEffect, useState } from "react"
import { EmojiPicker } from "../../components/Picker/Emoji"
import { useRepo, useTranslation } from "../../context"
import { useProfiles } from "../../hooks"
import type { StringKey } from "../../../i18n"
import { gitApi } from "../../../infrastructure/git"
import { SectionHeading, WideCard } from "./SettingsCards"
import { ProfileList } from "../../components/Profile/List"
import styles from "./style.module.scss"

function ignoreBackgroundLoadError(): void {}

function buildIdentityScopeHint(t: (key: StringKey) => string, repoRoot: string): string {
  const scopeLabel = repoRoot ? t("scopeLocal") : t("scopeGlobal")
  return `${t("identityHint")} · ${scopeLabel}`
}

export function ProfilesSection() {
  const { t } = useTranslation()
  return (
    <>
      <SectionHeading icon={<UserRound size={13} />} title={t("identity")} />
      <IdentitySettings />
    </>
  )
}

function IdentitySettings() {
  const { t } = useTranslation()
  const [identityName, setIdentityName] = useState("")
  const [identityEmail, setIdentityEmail] = useState("")
  const [profileEmoji, setProfileEmoji] = useState("")
  const [statusMessage, setStatusMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const { repo: repoRoot } = useRepo()
  const profilesApi = useProfiles()
  const isGlobalScope = !repoRoot
  const canAddProfile = identityName.trim() !== "" && identityEmail.trim() !== ""

  useEffect(() => {
    let isAlive = true
    gitApi
      .identity(repoRoot)
      .then((identity) => {
        if (!isAlive) return
        setIdentityName(identity.name)
        setIdentityEmail(identity.email)
      })
      .catch(ignoreBackgroundLoadError)
    return () => {
      isAlive = false
    }
  }, [repoRoot])

  const handleSaveIdentity = async () => {
    setIsSaving(true)
    setStatusMessage("")
    try {
      await gitApi.configSet(repoRoot, "user.name", identityName.trim(), isGlobalScope)
      await gitApi.configSet(repoRoot, "user.email", identityEmail.trim(), isGlobalScope)
      setStatusMessage(t("identitySaved"))
    } catch (caughtError) {
      setStatusMessage(String(caughtError))
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddProfile = () => {
    const wasAdded = profilesApi.add(identityName, identityEmail, profileEmoji)
    if (!wasAdded) return
    setStatusMessage(t("identitySaved"))
  }

  const handleApplyProfile = (profileId: string) => {
    void profilesApi.apply(profileId)
  }

  return (
    <WideCard icon={<UserRound size={15} />} title={t("identity")} hint={buildIdentityScopeHint(t, repoRoot)}>
      <div className={styles.presetForm}>
        <input
          aria-label={t("profileEmoji")}
          value={profileEmoji}
          placeholder={t("profileEmoji")}
          maxLength={8}
          onChange={(changeEvent) => setProfileEmoji(changeEvent.target.value)}
          className={styles.emojiInput}
        />
        <EmojiPicker title={t("emojiPicker")} onPick={(pickedEmoji) => setProfileEmoji(pickedEmoji)} />
        <input
          aria-label={t("identityName")}
          value={identityName}
          placeholder={t("identityName")}
          onChange={(changeEvent) => setIdentityName(changeEvent.target.value)}
        />
        <input
          aria-label={t("identityEmail")}
          value={identityEmail}
          placeholder={t("identityEmail")}
          onChange={(changeEvent) => setIdentityEmail(changeEvent.target.value)}
        />
        <button type="button" className="mini-btn" disabled={isSaving} onClick={handleSaveIdentity}>
          {t("saveBtn")}
        </button>
        <button
          type="button"
          className="mini-btn"
          disabled={!canAddProfile}
          title={t("addProfile")}
          onClick={handleAddProfile}
        >
          <UserPlus size={12} /> {t("addProfile")}
        </button>
      </div>
      {statusMessage && <p className={styles.muted}>{statusMessage}</p>}
      <p className={styles.miniHead}>
        {t("profiles")} · {t("profilesHint")}
      </p>
      <ProfileList
        profiles={profilesApi.profiles}
        activeProfileId={profilesApi.activeId}
        onApplyProfile={handleApplyProfile}
        onRemoveProfile={profilesApi.remove}
      />
    </WideCard>
  )
}
