import type { Lang } from "../../types"
import type { SearchScope } from "../../presentation/context"

export const SEARCH_SCOPE_OPTIONS: Record<Lang, { value: SearchScope; label: string }[]> = {
  pt: [
    { value: "all", label: "Tudo" },
    { value: "commits", label: "Commits" },
    { value: "branches", label: "Branches" },
    { value: "files", label: "Arquivos" },
  ],
  en: [
    { value: "all", label: "All" },
    { value: "commits", label: "Commits" },
    { value: "branches", label: "Branches" },
    { value: "files", label: "Files" },
  ],
}
