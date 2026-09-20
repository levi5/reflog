import { ProfileManagerUseCase } from "../../../data/use-cases/profile/profile-manager-use-case"
import { localStorageAdapter } from "../../../infrastructure/storage"

export const makeProfileManagerUseCase = (): ProfileManagerUseCase => {
  return new ProfileManagerUseCase(localStorageAdapter)
}

export const profileManagerUseCase = makeProfileManagerUseCase()
