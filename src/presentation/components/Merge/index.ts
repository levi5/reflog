import { MergeBanner } from "./Banner"
import { MergeCompare } from "./Compare"
import { MergeConflict } from "./Conflict"
import { MergeFile } from "./File"
import { MergeRebase } from "./Rebase"

export const Merge = {
  Banner: MergeBanner,
  Conflict: MergeConflict,
  File: MergeFile,
  Compare: MergeCompare,
  Rebase: MergeRebase,
}
