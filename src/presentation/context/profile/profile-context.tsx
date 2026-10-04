import { profileManagerUseCase } from "../../../data"
import { createContext, type ReactNode, useCallback, useContext, useState } from "react"
import type { GitProfile } from "../../../domain/entities/profile/profiles"
import { gitApi } from "../../../infrastructure/git"
import { formatMessage } from "../../../i18n"
import { useMessageActions } from "../message"
import { useTranslation } from "../translation"

export interface ProfileContextValue {
  profiles: GitProfile[]
  activeId: string
  active: GitProfile | null
  add: (name: string, email: string, emoji?: string) => boolean
  remove: (id: string) => void
  apply: (id: string) => Promise<boolean>
  cycle: () => Promise<void>
}

export const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({
  repoRoot,
  setMsg,
  children,
}: {
  repoRoot?: string
  setMsg?: (m: string) => void
  children: ReactNode
}) {
  const [profiles, setProfiles] = useState<GitProfile[]>(() => profileManagerUseCase.loadProfiles())
  const [activeId, setActiveId] = useState<string>(() => profileManagerUseCase.loadActiveProfileId())
  const messageService = useMessageActions()
  const { lang } = useTranslation()

  const active = profiles.find((p) => p.id === activeId) ?? null

  const persist = useCallback((list: GitProfile[], id: string) => {
    setProfiles(list)
    setActiveId(id)
    profileManagerUseCase.saveProfiles(list)
    profileManagerUseCase.saveActiveProfileId(id)
  }, [])

  const add = useCallback(
    (name: string, email: string, emoji = ""): boolean => {
      if (!name.trim() || !email.trim()) return false
      const p = profileManagerUseCase.newProfile(name, email, emoji)
      const list = [...profiles, p]
      persist(list, activeId || p.id)
      return true
    },
    [profiles, activeId, persist],
  )

  const remove = useCallback(
    (id: string) => {
      const list = profiles.filter((p) => p.id !== id)
      persist(list, activeId === id ? (list[0]?.id ?? "") : activeId)
    },
    [profiles, activeId, persist],
  )

  const apply = useCallback(
    async (id: string): Promise<boolean> => {
      const p = profiles.find((x) => x.id === id)
      if (!p) return false
      const root = repoRoot ?? ""
      const global = !root
      const loadingId = messageService.loading(formatMessage(lang, "applyProfileLoading", { name: p.name }))
      try {
        await gitApi.configSet(root, "user.name", p.name, global)
        await gitApi.configSet(root, "user.email", p.email, global)
        persist(profiles, id)
        const successMsg = formatMessage(lang, "applyProfileSuccess", { name: p.name, email: p.email })
        setMsg?.(successMsg)
        messageService.dismiss(loadingId)
        messageService.success(successMsg)
        return true
      } catch (e) {
        messageService.dismiss(loadingId)
        const errorMsg = String(e)
        setMsg?.(errorMsg)
        messageService.error(errorMsg)
        return false
      }
    },
    [profiles, repoRoot, lang, setMsg, persist, messageService],
  )

  const cycle = useCallback(async () => {
    if (profiles.length === 0) return
    const idx = profiles.findIndex((p) => p.id === activeId)
    const next = profiles[(idx + 1) % profiles.length]
    await apply(next.id)
  }, [profiles, activeId, apply])

  return (
    <ProfileContext.Provider value={{ profiles, activeId, active, add, remove, apply, cycle }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfilesContext(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) {
    throw new Error("useProfilesContext must be used within ProfileProvider")
  }
  return ctx
}
