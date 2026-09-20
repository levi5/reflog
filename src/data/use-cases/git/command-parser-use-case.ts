import { DANGEROUS, INTENT_VERBS, QUICK, READ_ONLY, TEMPLATES } from "../../../shared/constants/gitConsole"
import type { IGitCommandParserUseCase, Intent } from "../../../domain/entities/git/git-console"

export class GitCommandParserUseCase implements IGitCommandParserUseCase {
  splitArgs(input: string): string[] {
    const out: string[] = []
    let cur = ""
    let quote = ""
    for (const ch of input) {
      if (quote) {
        if (ch === quote) quote = ""
        else cur += ch
        continue
      }
      if (ch === '"' || ch === "'") {
        quote = ch
        continue
      }
      if (/\s/.test(ch)) {
        if (cur) {
          out.push(cur)
          cur = ""
        }
        continue
      }
      cur += ch
    }
    if (cur) out.push(cur)
    return out
  }

  stripGitPrefix(raw: string): string {
    const text = raw.trim()
    if (text === "git") return ""
    if (text.startsWith("git ")) return text.slice(4)
    return text
  }

  splitChain(input: string): string[] {
    const steps: string[] = []
    let current = ""
    let quote = ""
    for (let index = 0; index < input.length; index++) {
      const ch = input[index]
      if (quote) {
        current += ch
        if (ch === quote) quote = ""
        continue
      }
      if (ch === '"' || ch === "'") {
        quote = ch
        current += ch
        continue
      }
      if (ch === "&" && input[index + 1] === "&") {
        steps.push(current)
        current = ""
        index++
        continue
      }
      current += ch
    }
    steps.push(current)
    return steps.map((step) => step.trim()).filter((step) => step !== "")
  }

  isDangerousCmd(text: string): boolean {
    const args = this.splitArgs(text)
    if (args.length === 0) return false
    const [verb, ...rest] = args
    if (rest.includes("--abort") || rest.includes("--quit")) return false
    if (verb && DANGEROUS.has(verb)) return true
    if (verb === "branch" && (rest.includes("-d") || rest.includes("-D") || rest.includes("--delete"))) return true
    if (verb === "tag" && rest.includes("-d")) return true
    return false
  }

  intentOf(raw: string): Intent | null {
    const args = this.splitArgs(this.stripGitPrefix(raw))
    if (args.length === 0) return null
    const [verb, ...rest] = args
    if (!verb || !INTENT_VERBS.includes(verb)) return verb ? { kind: "blocked", arg: verb } : null

    const positional = rest.filter((a) => !a.startsWith("-"))
    const arg = positional[0] ?? ""

    if (verb === "checkout" || verb === "switch") return { kind: "checkout", arg }
    if (verb === "branch")
      return {
        kind: rest.includes("-d") || rest.includes("-D") || rest.includes("--delete") ? "branch-del" : "branch",
        arg,
      }
    if (verb === "merge") return { kind: "merge", arg }
    if (verb === "commit") {
      const match = /-m\s+(?:"([^"]*)"|'([^']*)'|(\S+))/.exec(raw)
      return {
        kind: "commit",
        arg: match?.[1] ?? match?.[2] ?? match?.[3] ?? "",
      }
    }
    if (verb === "tag") return { kind: "tag", arg }
    if (verb === "help" || verb === "clear") return { kind: "local", arg: verb }
    if (
      verb === "reset" ||
      verb === "rebase" ||
      verb === "revert" ||
      verb === "cherry-pick" ||
      verb === "reflog" ||
      verb === "submodule" ||
      verb === "add"
    )
      return { kind: "do", arg: `${verb} ${rest.join(" ")}`.trim() }
    return { kind: "read", arg: verb }
  }
}

export { DANGEROUS, INTENT_VERBS, QUICK, READ_ONLY, TEMPLATES }
