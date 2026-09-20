import { ConflictMap } from "./Map"
import { ConflictSidebar } from "./Sidebar"
import { HunkBlock } from "./Hunk"
import { InlineEditor } from "./Editor"
import { ResolutionHelper } from "./Resolution"

export const MergeConflict = {
  Map: ConflictMap,
  Sidebar: ConflictSidebar,
  Hunk: HunkBlock,
  Editor: InlineEditor,
  Resolution: ResolutionHelper,
}

export { ConflictMap, ConflictSidebar, HunkBlock, InlineEditor, ResolutionHelper }
