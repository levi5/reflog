import { Bookmark, FileText } from "lucide-react"
import type { ReactNode } from "react"
import type { CommitTemplateApi } from "../../../hooks"
import { COMMIT_TYPES } from "../../../../shared/constants/commit/commitTemplate"
import type { StringKey } from "../../../../i18n"
import { TYPE_ICONS } from "../index"

type Translate = (key: StringKey) => string

export function buildTypeOptions(
  translate: Translate,
  useIcons: boolean,
): { value: string; label: string; icon?: ReactNode }[] {
  return [
    { value: "", label: translate("commitNoType") },
    ...COMMIT_TYPES.map((commitType) => {
      const TypeIcon = TYPE_ICONS[commitType]
      return {
        value: commitType,
        label: commitType,
        icon: useIcons && TypeIcon ? <TypeIcon size={13} aria-hidden /> : undefined,
      }
    }),
  ]
}

interface TemplateOption {
  value: string
  label: string
  icon?: ReactNode
}

export function buildTemplateOptions(api: CommitTemplateApi): {
  options: TemplateOption[]
  currentValue: string
} {
  const options: TemplateOption[] = [
    ...api.presets.map((preset) => ({
      value: `preset:${preset.id}`,
      label: preset.scope ? `${preset.name} (${preset.scope})` : preset.name,
      icon: <Bookmark size={13} aria-hidden />,
    })),
    ...api.docs.map((doc) => ({
      value: `doc:${doc.id}`,
      label: doc.name,
      icon: <FileText size={13} aria-hidden />,
    })),
  ]
  const currentValue = `doc:${api.activeDocId}`
  return { options, currentValue }
}

export function handlePickTemplate(api: CommitTemplateApi, selectedValue: string) {
  if (selectedValue.startsWith("preset:")) {
    const preset = api.presets.find((candidate) => candidate.id === selectedValue.slice(7))
    if (preset) api.applyPreset(preset)
    return
  }
  if (selectedValue.startsWith("doc:")) {
    const doc = api.docs.find((candidate) => candidate.id === selectedValue.slice(4))
    if (doc) api.applyDocTemplate(doc)
  }
}
