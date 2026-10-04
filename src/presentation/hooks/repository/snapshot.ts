import type { BranchInfo, ConflictFile, FileStatus, RemoteInfo, StatusResult, SubmoduleInfo } from "../../../types"

export function sameFileStatus(a: FileStatus, b: FileStatus): boolean {
  return a.path === b.path && a.x === b.x && a.y === b.y && a.staged === b.staged && a.unmerged === b.unmerged
}

export function sameFiles(a: FileStatus[], b: FileStatus[]): boolean {
  return a.length === b.length && a.every((file, index) => sameFileStatus(file, b[index]))
}

export function sameStatus(a: StatusResult | null, b: StatusResult): boolean {
  if (!a) return false
  return (
    a.root === b.root &&
    a.branch === b.branch &&
    a.head === b.head &&
    a.ahead === b.ahead &&
    a.behind === b.behind &&
    a.merging === b.merging &&
    a.cherryPicking === b.cherryPicking &&
    a.reverting === b.reverting &&
    a.rebasing === b.rebasing &&
    sameFiles(a.files, b.files)
  )
}

export function sameBranches(a: BranchInfo[], b: BranchInfo[]): boolean {
  return (
    a.length === b.length &&
    a.every((branch, index) => {
      const other = b[index]
      return (
        other !== undefined &&
        branch.name === other.name &&
        branch.current === other.current &&
        branch.remote === other.remote &&
        branch.ahead === other.ahead &&
        branch.behind === other.behind &&
        branch.upstream === other.upstream
      )
    })
  )
}

export function sameConflicts(a: ConflictFile[], b: ConflictFile[]): boolean {
  return (
    a.length === b.length &&
    a.every((file, index) => {
      const other = b[index]
      return other !== undefined && file.path === other.path && file.content === other.content
    })
  )
}

export function sameStrings(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

export function sameRemotes(a: RemoteInfo[], b: RemoteInfo[]): boolean {
  return (
    a.length === b.length &&
    a.every((remote, index) => {
      const other = b[index]
      return other !== undefined && remote.name === other.name && remote.url === other.url
    })
  )
}

export function sameSubmodules(a: SubmoduleInfo[], b: SubmoduleInfo[]): boolean {
  return (
    a.length === b.length &&
    a.every((submodule, index) => {
      const other = b[index]
      return (
        other !== undefined &&
        submodule.name === other.name &&
        submodule.path === other.path &&
        submodule.url === other.url &&
        submodule.branch === other.branch &&
        submodule.hash === other.hash &&
        submodule.state === other.state &&
        submodule.ahead === other.ahead &&
        submodule.behind === other.behind
      )
    })
  )
}
