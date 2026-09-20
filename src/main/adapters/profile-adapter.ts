import type { GitProfile } from "../../domain/entities/profile/profiles"
import { profileManagerUseCase } from "../factories/use-cases/profile-factory"

export const loadProfiles = (): GitProfile[] => profileManagerUseCase.loadProfiles()
export const saveProfiles = (profiles: GitProfile[]): void => profileManagerUseCase.saveProfiles(profiles)
export const loadActiveProfileId = (): string => profileManagerUseCase.loadActiveProfileId()
export const saveActiveProfileId = (id: string): void => profileManagerUseCase.saveActiveProfileId(id)
export const newProfile = (name: string, email: string, emoji?: string): GitProfile =>
  profileManagerUseCase.newProfile(name, email, emoji)
