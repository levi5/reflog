import { GitLensList } from "./GitLens"
import { GraphViewer } from "./View"
import { HistorySearchPanel } from "./HistorySearch"

export const Graph = {
  GitLens: GitLensList,
  View: GraphViewer,
  HistorySearch: HistorySearchPanel,
}

export { HistorySearchPanel }
export { computeCanvasGeometry, computeVisibleRange, isEdgeVisible } from "./Canvas/canvas-layout"
