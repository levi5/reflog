import { ACTIVE_PROFILE_STORAGE_KEY, PROFILES_STORAGE_KEY } from "../../../shared/constants/profiles"
import type { GitProfile, IProfileManagerUseCase } from "../../../domain/entities/profile/profiles"
import type { IStorage } from "../../protocols/storage"
import { localStorageAdapter } from "../../../infrastructure/storage"
import { MAX_PROFILES } from "../../../shared/constants/limits"
import { newId } from "../../../shared/utils/id"

export class ProfileManagerUseCase implements IProfileManagerUseCase {
  constructor(private readonly storage: IStorage = localStorageAdapter) {}

  loadProfiles(): GitProfile[] {
    const list = this.storage.get<unknown>(PROFILES_STORAGE_KEY, [])
    if (!Array.isArray(list)) return []
    return list
      .filter(
        (v): v is GitProfile =>
          typeof v === "object" &&
          v !== null &&
          typeof (v as GitProfile).id === "string" &&
          typeof (v as GitProfile).name === "string" &&
          typeof (v as GitProfile).email === "string",
      )
      .map((profile) => ({
        ...profile,
        emoji: typeof profile.emoji === "string" ? profile.emoji : "",
      }))
      .slice(0, MAX_PROFILES)
  }

  saveProfiles(profiles: GitProfile[]): void {
    this.storage.set(PROFILES_STORAGE_KEY, profiles)
  }

  loadActiveProfileId(): string {
    const id = this.storage.get<unknown>(ACTIVE_PROFILE_STORAGE_KEY, "")
    return typeof id === "string" ? id : ""
  }

  saveActiveProfileId(id: string): void {
    this.storage.set(ACTIVE_PROFILE_STORAGE_KEY, id)
  }

  newProfile(name: string, email: string, emoji = ""): GitProfile {
    return {
      id: newId("profile"),
      name: name.trim(),
      email: email.trim(),
      emoji: emoji.trim(),
    }
  }
}
