export interface FileStatus {
  path: string
  x: string
  y: string
  staged: boolean
  unmerged: boolean
}

export interface StatusResult {
  root: string
  branch: string
  ahead: number
  behind: number
  files: FileStatus[]
  merging: boolean
  cherryPicking: boolean
  reverting: boolean
}

export interface BranchInfo {
  name: string
  current: boolean
  remote: boolean
  ahead?: number
  behind?: number
  upstream?: string | null
}

export interface Identity {
  name: string
  email: string
}

export interface RemoteInfo {
  name: string
  url: string
}

export interface SubmoduleInfo {
  name: string
  path: string
  url: string
  branch: string
  hash: string
  state: string
}

export interface CommitInfo {
  hash: string
  short: string
  author: string
  date: string
  message: string
  parents: string[]
  refs: string[]
}

export interface ReflogEntry {
  hash: string
  short: string
  selector: string
  action: string
  author: string
  date: string
}

export interface StashItem {
  index: number
  hash: string
  selector: string
  message: string
  author: string
  date: string
}

export interface CommitFileChange {
  status: string
  path: string
  oldPath?: string
}

export interface ConflictBlock {
  id: number
  start_line: number
  mid_line?: number | null
  base_start?: number | null
  base_end?: number | null
  end_line: number
  current_label: string
  incoming_label: string
  current: string[]
  base: string[]
  incoming: string[]
  is_diff3: boolean
}

export interface ConflictFile {
  path: string
  abs_path: string
  content: string
  conflicts: ConflictBlock[]
}

export type Lang = "pt" | "en"

export type Theme = "dark" | "light" | "glass-dark" | "glass-light"

export type AccentId = "grape" | "blue" | "teal" | "green" | "amber" | "red" | "orange"

export interface AccentOption {
  id: AccentId
  /** Hex usado nos temas escuros (dark / glass-dark) */
  dark: string
  /** Hex usado nos temas claros (light / glass-light), mais escuro por contraste */
  light: string
}

export type FontSize = number

export const DEFAULT_FONT_SIZE = 13
export const MIN_FONT_SIZE = 10
export const MAX_FONT_SIZE = 20
