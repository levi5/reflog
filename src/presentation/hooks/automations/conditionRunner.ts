import { _Either, _match } from "funcio"
import type { AutomationAlias, ConditionKind } from "../../../domain/entities/automations/automations"
import {
  conditionArgs,
  expandAlias,
  parseClean,
  parseSubmoduleReady,
  splitArgs,
  stripGitPrefix,
} from "../../../main/adapters"
import type { IGitApi } from "../../../infrastructure/git/types"
import { gitApi as defaultGitApi } from "../../../infrastructure/git"

export async function evalCondition(
  kind: ConditionKind,
  arg: string,
  targetRoot: string,
  aliases: AutomationAlias[],
  git: Pick<IGitApi, "run"> = defaultGitApi,
): Promise<boolean> {
  const result = await _Either.try.async(async () => {
    return _match<ConditionKind, Promise<boolean>>(kind)
      .with("clean", async () => {
        const status = await git.run(targetRoot, ["status", "--porcelain"])
        return parseClean(status)
      })
      .with("command-ok", async () => {
        const expanded = expandAlias(arg, aliases)
        const args = splitArgs(stripGitPrefix(expanded))
        if (args.length === 0) return false
        await git.run(targetRoot, args)
        return true
      })
      ._(async () => {
        const args = conditionArgs({ kind, arg })
        if (!args) return false
        const out = await git.run(targetRoot, args)
        if (kind === "submodule-ready") return parseSubmoduleReady(out)
        return true
      })
      .exec()
  })

  return result.isRight() ? await (result.value as Promise<boolean>) : false
}
