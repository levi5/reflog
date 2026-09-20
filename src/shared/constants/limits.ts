export const AUTOMATION_LOG_TAIL = 100
export const CONSOLE_TAIL_LENGTH = 50
export const COMMAND_HISTORY_LIMIT = 30
export const EMPTY_OUTPUT_PLACEHOLDER = "ok"
export const NO_ACTIVE_SUGGESTION = -1
export const FRESH_TTL_MS = 25_000
export const AUTO_REFRESH_MS = 30_000
export const FOCUS_GAP_MS = 10_000
export const COPY_FEEDBACK_MS = 1_500
export const HASH_SHORT_LENGTH = 7
export const LOG_LIMIT = 50
export const GRAPH_LIMIT = 100
export const REFLOG_LIMIT = 100
export const MAX_RECENTS = 8
export const MAX_PROFILES = 12
export const COMMIT_DETAIL_WIDTH = 280
export const COMMIT_DETAIL_MIN_WIDTH = 220
export const COMMIT_DETAIL_MAX_WIDTH = 520

export const SIDEBAR_DEFAULTS = {
  initial: 300,
  min: 220,
  max: 560,
} as const

export const EXPORT_AUTOMATIONS_FILE = "reflog-automations.toml"
