import {
  Archive,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Download,
  FileDiff,
  FilePlus,
  FileText,
  GitBranch,
  GitMerge,
  History,
  List,
  ListPlus,
  Package,
  type Play,
  Plus,
  Search,
  Tag,
  Trash2,
  Undo2,
} from "lucide-react"
import type { Lang } from "../../../types"

export interface BlockField {
  key: string
  ph: Record<Lang, string>
  def?: string
}

export interface BlockFlag {
  key: string
  label: Record<Lang, string>
  flag: string
}

export interface CommandBlock {
  id: string
  cat: string
  icon: typeof Play
  title: Record<Lang, string>
  fields?: BlockField[]
  flags?: BlockFlag[]
  build: (values: Record<string, string>, fields: Record<string, boolean>) => string | null
}

export interface BlockCategory {
  id: string
  title: Record<Lang, string>
}

export const VISUALIZE_CATEGORIES: BlockCategory[] = [
  { id: "branches", title: { pt: "Branches", en: "Branches" } },
  { id: "changes", title: { pt: "Mudanças", en: "Changes" } },
  { id: "sync", title: { pt: "Sincronizar", en: "Sync" } },
  { id: "undo", title: { pt: "Desfazer", en: "Undo" } },
  { id: "view", title: { pt: "Ver", en: "View" } },
]

export const VISUALIZE_COMMAND_BLOCKS: CommandBlock[] = [
  {
    id: "branch",
    cat: "branches",
    icon: GitBranch,
    title: { pt: "Criar branch", en: "Create branch" },
    fields: [{ key: "name", ph: { pt: "nome", en: "name" } }],
    build: (values) => {
      const name = (values["branch.name"] ?? values["branch-del.name"] ?? "").trim()
      return name ? `checkout -b ${name}` : null
    },
  },
  {
    id: "checkout",
    cat: "branches",
    icon: ArrowRight,
    title: { pt: "Trocar de branch", en: "Switch branch" },
    fields: [{ key: "branch", ph: { pt: "branch", en: "branch" } }],
    flags: [{ key: "b", label: { pt: "criar (-b)", en: "create (-b)" }, flag: "-b" }],
    build: (values, flags) => {
      const branch = (values["checkout.branch"] ?? "").trim()
      if (!branch) return null
      return flags["checkout.b"] ? `checkout -b ${branch}` : `checkout ${branch}`
    },
  },
  {
    id: "list",
    cat: "branches",
    icon: List,
    title: { pt: "Listar de branch", en: "List branch" },
    build: () => "branch --list",
  },
  {
    id: "merge",
    cat: "branches",
    icon: GitMerge,
    title: { pt: "Fundir branch", en: "Merge branch" },
    fields: [{ key: "branch", ph: { pt: "branch", en: "branch" } }],
    build: (values) => {
      const branch = (values["merge.branch"] ?? "").trim()
      return branch ? `merge ${branch}` : null
    },
  },
  {
    id: "commit",
    cat: "changes",
    icon: FileText,
    title: { pt: "Commitar", en: "Commit" },
    fields: [{ key: "message", ph: { pt: "mensagem", en: "message" } }],
    build: (values) => {
      const message = (values["commit.message"] ?? "").trim()
      return message ? `commit -m "${message}"` : null
    },
  },
  {
    id: "add",
    cat: "changes",
    icon: Plus,
    title: { pt: "Adicionar (git add)", en: "Stage (git add)" },
    fields: [{ key: "path", ph: { pt: "arquivo (vazio = tudo)", en: "file (empty = all)" } }],
    build: (values) => {
      const path = (values["add.path"] ?? "").trim()
      return path ? `add -- ${path}` : "add -A"
    },
  },
  {
    id: "add-commit",
    cat: "changes",
    icon: FilePlus,
    title: { pt: "Add + commit", en: "Add + commit" },
    fields: [
      { key: "message", ph: { pt: "mensagem", en: "message" } },
      { key: "path", ph: { pt: "arquivo (vazio = tudo)", en: "file (empty = all)" } },
    ],
    build: (values) => {
      const message = (values["add-commit.message"] ?? "").trim()
      if (!message) return null
      const path = (values["add-commit.path"] ?? "").trim()
      const addStep = path ? `add -- ${path}` : "add -A"
      return `${addStep} && commit -m "${message}"`
    },
  },
  {
    id: "tag",
    cat: "changes",
    icon: Tag,
    title: { pt: "Criar tag", en: "Create tag" },
    fields: [
      { key: "name", ph: { pt: "nome", en: "name" } },
      {
        key: "message",
        ph: { pt: "mensagem (anotada)", en: "message (annotated)" },
      },
    ],
    flags: [
      {
        key: "a",
        label: { pt: "anotada (-a)", en: "annotated (-a)" },
        flag: "-a",
      },
    ],
    build: (values, flags) => {
      const name = (values["tag.name"] ?? "").trim()
      if (!name) return null
      const message = (values["tag.message"] ?? "").trim()
      if (flags["tag.a"]) return message ? `tag -a ${name} -m "${message}"` : null
      return `tag ${name}`
    },
  },
  {
    id: "fetch",
    cat: "sync",
    icon: Download,
    title: { pt: "Buscar (fetch)", en: "Fetch" },
    fields: [],
    build: () => "fetch --prune",
  },
  {
    id: "pull",
    cat: "sync",
    icon: ArrowDown,
    title: { pt: "Puxar (pull)", en: "Pull" },
    fields: [],
    build: () => "pull",
  },
  {
    id: "push",
    cat: "sync",
    icon: ArrowUp,
    title: { pt: "Enviar (push)", en: "Push" },
    fields: [],
    build: () => "push",
  },
  {
    id: "stash",
    cat: "changes",
    icon: Package,
    title: { pt: "Guardar (stash)", en: "Stash" },
    fields: [],
    build: () => "stash",
  },
  {
    id: "pop",
    cat: "changes",
    icon: Archive,
    title: { pt: "Aplicar stash (pop)", en: "Apply stash (pop)" },
    fields: [],
    build: () => "stash pop",
  },
  {
    id: "reset",
    cat: "undo",
    icon: History,
    title: { pt: "Voltar (reset --soft)", en: "Reset soft" },
    fields: [{ key: "ref", ph: { pt: "ref", en: "ref" }, def: "HEAD~1" }],
    build: (values) => `reset --soft ${(values["reset.ref"] ?? "").trim() || "HEAD~1"}`,
  },
  {
    id: "revert",
    cat: "undo",
    icon: Undo2,
    title: { pt: "Reverter commit", en: "Revert commit" },
    fields: [{ key: "ref", ph: { pt: "hash ou ref", en: "hash or ref" } }],
    build: (values) => {
      const ref = (values["revert.ref"] ?? "").trim()
      return ref ? `revert ${ref}` : null
    },
  },
  {
    id: "cherry-pick",
    cat: "undo",
    icon: ListPlus,
    title: { pt: "Pescar commit", en: "Cherry-pick" },
    fields: [{ key: "ref", ph: { pt: "hash ou ref", en: "hash or ref" } }],
    build: (values) => {
      const ref = (values["cherry-pick.ref"] ?? "").trim()
      return ref ? `cherry-pick ${ref}` : null
    },
  },
  {
    id: "branch-del",
    cat: "branches",
    icon: Trash2,
    title: { pt: "Excluir branch", en: "Delete branch" },
    fields: [{ key: "name", ph: { pt: "nome", en: "name" } }],
    build: (values) => {
      const name = (values["branch-del.name"] ?? "").trim()
      return name ? `branch -D ${name}` : null
    },
  },
  {
    id: "log",
    cat: "view",
    icon: List,
    title: { pt: "Ver histórico", en: "View history" },
    fields: [{ key: "n", ph: { pt: "quantidade", en: "count" }, def: "10" }],
    build: (values) => {
      const lineCount = ((values["log.n"] ?? "").trim() || "10").replace(/\D/g, "") || "10"
      return `log --oneline -${lineCount}`
    },
  },
  {
    id: "status",
    cat: "view",
    icon: FileDiff,
    title: { pt: "Ver mudanças", en: "View changes" },
    fields: [],
    build: () => "status --short",
  },
  {
    id: "diff",
    cat: "view",
    icon: Search,
    title: { pt: "Ver diff", en: "View diff" },
    fields: [],
    build: () => "diff --stat",
  },
]

export const CATS = VISUALIZE_CATEGORIES
export const BLOCKS = VISUALIZE_COMMAND_BLOCKS
