import type { NextVersionsType } from "../../domain/entities/semver/semver"
import { semverUseCase } from "../factories/use-cases/semver-factory"

export const suggestNextVersions = (tags: string[]): NextVersionsType | null => semverUseCase.suggestNextVersions(tags)
