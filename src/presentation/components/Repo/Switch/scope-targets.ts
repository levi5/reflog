import { mergeStatsUseCase } from "../../../../data"
import { t } from "../../../../i18n"
import type { Lang, SubmoduleInfo } from "../../../../types"

export type ScopeTone = "ok" | "warn" | "muted" | "danger"

export type ScopeGroupId = "parents" | "siblings" | "children" | "recents"

export interface ScopeTarget {
  id: string
  path: string
  name: string
  hint: string
  tone?: ScopeTone
  badge?: string
  outdated?: boolean
  behind?: number
}

export interface ScopeGroup {
  id: ScopeGroupId
  label: string
  targets: ScopeTarget[]
}

interface BuildScopeGroupsInput {
  lang: Lang
  repo: string
  chain: string[]
  submodules: SubmoduleInfo[]
  siblingModules: SubmoduleInfo[]
  recents: string[]
  maxRecents?: number
}

export function isOutdated(sub: SubmoduleInfo): boolean {
  return sub.behind > 0
}

function submoduleTargets(base: string, submodules: SubmoduleInfo[]): ScopeTarget[] {
  return submodules.map((sub) => {
    const outdated = isOutdated(sub)
    return {
      id: `sub:${base}:${sub.path}`,
      path: `${base}/${sub.path}`,
      name: mergeStatsUseCase.repoBaseName(sub.path) || sub.name || sub.path,
      hint: sub.path,
      tone: outdated ? "warn" : "ok",
      outdated,
      behind: sub.behind,
    }
  })
}

function claim(seen: Set<string>, path: string): boolean {
  if (!path || seen.has(path)) return false
  seen.add(path)
  return true
}

function uniquePaths(seen: Set<string>, paths: string[]): string[] {
  return paths.filter((path) => claim(seen, path))
}

function uniqueTargets(seen: Set<string>, targets: ScopeTarget[], prefix: string): ScopeTarget[] {
  return targets
    .filter((target) => claim(seen, target.path))
    .map((target) => ({ ...target, id: `${prefix}:${target.path}` }))
}

function addGroup(groups: ScopeGroup[], group: ScopeGroup) {
  if (group.targets.length > 0) groups.push(group)
}

export function buildScopeGroups({
  lang,
  repo,
  chain,
  submodules,
  siblingModules,
  recents,
  maxRecents = 12,
}: BuildScopeGroupsInput): ScopeGroup[] {
  const groups: ScopeGroup[] = []
  const seen = new Set<string>([repo])

  const parents = uniquePaths(seen, chain.slice(0, -1).reverse())
  addGroup(groups, {
    id: "parents",
    label: t(lang, parents.length > 1 ? "scopeAncestors" : "scopeSuperproject"),
    targets: parents.map((path, index) => ({
      id: `parent:${path}`,
      path,
      name: mergeStatsUseCase.repoBaseName(path),
      hint: path,
      tone: index === 0 ? "warn" : "muted",
      badge: index === 0 ? t(lang, "scopeDirectParent") : undefined,
    })),
  })

  addGroup(groups, {
    id: "siblings",
    label: t(lang, "scopeSiblings"),
    targets: uniqueTargets(seen, submoduleTargets(chain[chain.length - 2] ?? repo, siblingModules), "sibling"),
  })

  addGroup(groups, {
    id: "children",
    label: t(lang, "scopeSubmodules"),
    targets: uniqueTargets(seen, submoduleTargets(repo, submodules), "child"),
  })

  addGroup(groups, {
    id: "recents",
    label: t(lang, "recents"),
    targets: uniquePaths(seen, recents)
      .slice(0, maxRecents)
      .map((path) => ({
        id: `recent:${path}`,
        path,
        name: mergeStatsUseCase.repoBaseName(path),
        hint: path,
        tone: "muted",
      })),
  })

  return groups
}

export function filterScopeGroups(groups: ScopeGroup[], query: string): ScopeGroup[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return groups
  return groups
    .map((group) => ({
      ...group,
      targets: group.targets.filter(
        (target) =>
          target.name.toLowerCase().includes(needle) ||
          target.hint.toLowerCase().includes(needle) ||
          target.path.toLowerCase().includes(needle),
      ),
    }))
    .filter((group) => group.targets.length > 0)
}
