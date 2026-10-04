import { automationsUseCase, gitCommandParserUseCase } from "../../../data"
import { _Either, _match } from "funcio"
import type { AutomationAlias, ConditionKind } from "../../../domain/entities/automations/automations"
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
        return automationsUseCase.isClean(status)
      })
      .with("command-ok", async () => {
        const expanded = automationsUseCase.expandAlias(arg, aliases)
        const args = gitCommandParserUseCase.splitArgs(gitCommandParserUseCase.stripGitPrefix(expanded))
        if (args.length === 0) return false
        await git.run(targetRoot, args)
        return true
      })
      ._(async () => {
        const args = automationsUseCase.buildConditionArgs({ kind, arg })
        if (!args) return false
        const out = await git.run(targetRoot, args)
        if (kind === "submodule-ready") return automationsUseCase.isSubmoduleReady(out)
        return true
      })
      .exec()
  })

  return result.isRight() ? await (result.value as Promise<boolean>) : false
}
