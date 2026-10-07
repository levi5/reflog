import type { FileStatus, FileTreeNode } from "../../../types"

export function buildFileTree(tracked: string[], statuses: FileStatus[]): FileTreeNode[] {
  const statusMap = new Map(statuses.map((file) => [file.path, file]))
  const allPaths = new Set<string>([...tracked, ...statuses.map((file) => file.path)])
  const root: FileTreeNode[] = []
  const dirIndex = new Map<string, FileTreeNode>()

  const ensureDir = (dirPath: string): FileTreeNode => {
    const existing = dirIndex.get(dirPath)
    if (existing) return existing
    const parts = dirPath.split("/")
    const name = parts[parts.length - 1] || dirPath
    const node: FileTreeNode = { name, path: dirPath, isDir: true, children: [] }
    dirIndex.set(dirPath, node)
    const parentPath = parts.slice(0, -1).join("/")
    if (parentPath) {
      ensureDir(parentPath).children.push(node)
    } else {
      root.push(node)
    }
    return node
  }

  const sorted = [...allPaths].filter(Boolean).sort((a, b) => a.localeCompare(b))
  for (const filePath of sorted) {
    const segments = filePath.split("/")
    const parentPath = segments.slice(0, -1).join("/")
    if (parentPath) ensureDir(parentPath)
    const status = statusMap.get(filePath)
    const node: FileTreeNode = {
      name: segments[segments.length - 1],
      path: filePath,
      isDir: false,
      children: [],
      status: status ? `${status.x}${status.y}` : undefined,
      staged: status?.staged,
    }
    if (parentPath) {
      dirIndex.get(parentPath)?.children.push(node)
    } else {
      root.push(node)
    }
  }

  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    for (const node of nodes) if (node.isDir) sortNodes(node.children)
  }
  sortNodes(root)
  return root
}

export function filterTree(nodes: FileTreeNode[], query: string): FileTreeNode[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return nodes
  const out: FileTreeNode[] = []
  for (const node of nodes) {
    if (!node.isDir) {
      if (node.path.toLowerCase().includes(needle)) out.push(node)
      continue
    }
    const children = filterTree(node.children, query)
    if (node.path.toLowerCase().includes(needle) || children.length > 0) {
      out.push({ ...node, children: children.length > 0 ? children : node.children })
    }
  }
  return out
}
