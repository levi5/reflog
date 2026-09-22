import { GraphCanvas } from "./Canvas"
import { GitLensList } from "./GitLens"
import { GraphViewer } from "./View"
import { computeCanvasGeometry, computeVisibleRange, isEdgeVisible } from "./Canvas/canvas-layout"

export const Graph = {
  Canvas: GraphCanvas,
  GitLens: GitLensList,
  View: GraphViewer,
}

export { computeCanvasGeometry, computeVisibleRange, isEdgeVisible }
