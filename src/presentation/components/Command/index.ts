import { CommandBlocks } from "./Block"
import { CommandConfirmDialog } from "./Dialog/Confirm"
import { CommandInput } from "./Input"
import { CommandIntentHint } from "./IntentHint"
import { CommandLog } from "./Log"
import { CommandSuggestions } from "./Suggestions"

export const Command = {
  Blocks: CommandBlocks,
  ConfirmDialog: CommandConfirmDialog,
  Input: CommandInput,
  IntentHint: CommandIntentHint,
  Log: CommandLog,
  Suggestions: CommandSuggestions,
}
