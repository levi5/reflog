import { UserRound } from "lucide-react"

import { Select } from "../../Select"

import type { GitProfile } from "../../../../domain/entities/profile/profiles"
import { useTranslation } from "../../../context"

export type ProfileSelectProps = {
  profiles: GitProfile[]
  activeProfileId: string
  className?: string
  onSelectProfile: (profileId: string) => void
  onDeleteProfile?: (profileId: string) => void
}

export function ProfileSelect({ profiles, activeProfileId, className, onSelectProfile }: ProfileSelectProps) {
  const { t } = useTranslation()

  const profileOptions =
    profiles.length > 0
      ? profiles.map((profile) => ({
          value: profile.id,
          label: profile.name,
          icon: profile.emoji ? <span aria-hidden>{profile.emoji}</span> : <UserRound size={13} aria-hidden />,
        }))
      : [{ value: "", label: t("noProfiles") }]

  return (
    <Select
      className={className}
      label={t("profiles")}
      value={profiles.length > 0 ? activeProfileId : ""}
      options={profileOptions}
      disabled={profiles.length === 0}
      onChange={(profileId) => {
        if (profileId) void onSelectProfile(profileId)
      }}
    />
  )
}
