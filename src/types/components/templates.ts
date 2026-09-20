import type { RefObject } from "react"
import type { TemplateDoc } from "../../domain/entities/commit/commit-markdown"
import type { CommitPrefs, CommitPreset } from "../../domain/entities/commit/commit-template"
import type { Lang } from "../../types"

export type ViewTab = "templates" | "presets" | "prefs"

export interface TemplateVariable {
  token: string
  label: string
}

export interface TemplateEditorProps {
  lang?: Lang
  draft: TemplateDoc
  isActive: boolean
  livePreview: string
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onDraftChange: (updater: (prev: TemplateDoc) => TemplateDoc) => void
  onToggleActive: (active: boolean) => void
  onDuplicate: () => void
  onDeleteRequest: () => void
  onSave: () => void
  onInsertVariable: (token: string) => void
}

export interface TemplateSidebarProps {
  lang?: Lang
  docs: TemplateDoc[]
  selectedId: string | null
  prefs: CommitPrefs
  presets: CommitPreset[]
  viewTab: ViewTab
  page: number
  onSetViewTab: (tab: ViewTab) => void
  onSetPage: (page: number) => void
  onSelectDoc: (doc: TemplateDoc) => void
  onCreateNew: () => void
  onLoadExample: () => void
  onDeleteTemplate?: (doc: TemplateDoc) => void
  onDeletePreset: (id: string) => void
  onEditPreset?: (preset: CommitPreset) => void
}

export interface PresetsTabProps {
  lang?: Lang
  presets: CommitPreset[]
  prefs: CommitPrefs
  viewTab?: ViewTab
  docs?: TemplateDoc[]
  editingPreset?: CommitPreset | null
  onSelectTemplate?: (templateId: string) => void
  onAddPreset: (preset: CommitPreset) => void
  onUpdatePreset?: (preset: CommitPreset) => void
  onEditPreset?: (preset: CommitPreset) => void
  onCancelEditPreset?: () => void
  onDeletePreset?: (id: string) => void
  onToggleStrict: (strict: boolean) => void
  onToggleIcons: (useIcons: boolean) => void
}
