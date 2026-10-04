import { CircleCheck, CircleHelp, CircleMinus, GitCompareArrows, TriangleAlert, type LucideIcon } from "lucide-react"
import type { StringKey } from "../../../../i18n"
import type { SubmoduleInfo } from "../../../../types"
import styles from "./style.module.scss"

export interface SubmoduleStateView {
  Icon: LucideIcon
  className: string
  label: StringKey
}

export const STATE_VIEWS: Record<string, SubmoduleStateView> = {
  "": { Icon: CircleCheck, className: styles.stateOk, label: "subOk" },
  "+": { Icon: GitCompareArrows, className: styles.stateDiverged, label: "subDiverged" },
  "-": { Icon: CircleMinus, className: styles.stateUninitialized, label: "subUninitialized" },
  U: { Icon: TriangleAlert, className: styles.stateConflict, label: "subConflict" },
}

const FALLBACK_VIEW: SubmoduleStateView = {
  Icon: CircleHelp,
  className: styles.stateOk,
  label: "subOk",
}

export function submoduleStateView(state: string): SubmoduleStateView {
  return STATE_VIEWS[state.trim()] ?? FALLBACK_VIEW
}

export function isKnownSubmoduleState(state: string): boolean {
  return state.trim() in STATE_VIEWS
}

export function isOutdated(sub: SubmoduleInfo): boolean {
  return sub.behind > 0
}

export function hasOutdated(submodules: SubmoduleInfo[]): boolean {
  return submodules.some(isOutdated)
}

export function submodulesChanged(before: SubmoduleInfo[], after: SubmoduleInfo[]): boolean {
  if (before.length !== after.length) return true
  const previous = new Map(before.map((sub) => [sub.path, sub]))
  return after.some((sub) => {
    const old = previous.get(sub.path)
    return old === undefined || old.hash !== sub.hash || old.state !== sub.state || old.behind !== sub.behind
  })
}
