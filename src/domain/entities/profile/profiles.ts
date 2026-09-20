export interface GitProfile {
  id: string
  name: string
  email: string
  emoji?: string
}

export interface IProfileManagerUseCase {
  loadProfiles(): GitProfile[]
  saveProfiles(profiles: GitProfile[]): void
  loadActiveProfileId(): string
  saveActiveProfileId(id: string): void
  newProfile(name: string, email: string, emoji?: string): GitProfile
}
