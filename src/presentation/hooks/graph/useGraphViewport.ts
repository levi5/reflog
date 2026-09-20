import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useRef,
  useState,
} from "react"
import { clamp } from "../../../shared/utils/number"
import type { CanvasPoint, GraphViewport } from "../../../types/components/graph"

const MIN_SCALE = 0.4
const MAX_SCALE = 2.5
const ZOOM_STEP = 1.2
const WHEEL_ZOOM_IN = 1.1
const CANVAS_ORIGIN_OFFSET = 20

interface PanDragState {
  startClientX: number
  startClientY: number
  originX: number
  originY: number
}

const INITIAL_POSITION: CanvasPoint = { x: 0, y: 0 }

export function useGraphViewport(): GraphViewport {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState<CanvasPoint>(INITIAL_POSITION)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const panDragRef = useRef<PanDragState | null>(null)

  const zoomBy = useCallback((zoomFactor: number) => {
    setScale((previousScale) => clamp(previousScale * zoomFactor, MIN_SCALE, MAX_SCALE))
  }, [])

  const zoomIn = useCallback(() => zoomBy(ZOOM_STEP), [zoomBy])
  const zoomOut = useCallback(() => zoomBy(1 / ZOOM_STEP), [zoomBy])

  const reset = useCallback(() => {
    setScale(1)
    setPosition(INITIAL_POSITION)
  }, [])

  const centerOn = useCallback(
    (point: CanvasPoint) => {
      const container = containerRef.current
      const width = container?.clientWidth ?? 0
      const height = container?.clientHeight ?? 0
      if (width === 0 || height === 0) return
      setPosition({
        x: width / 2 - point.x * scale - CANVAS_ORIGIN_OFFSET,
        y: height / 2 - point.y * scale - CANVAS_ORIGIN_OFFSET,
      })
    },
    [scale],
  )

  const onWheel = useCallback(
    (event: ReactWheelEvent<HTMLElement>) => {
      if (event.ctrlKey || event.metaKey) {
        zoomBy(event.deltaY < 0 ? WHEEL_ZOOM_IN : 1 / WHEEL_ZOOM_IN)
      } else {
        setPosition((previous) => ({
          x: previous.x - event.deltaX,
          y: previous.y - event.deltaY,
        }))
      }
    },
    [zoomBy],
  )

  const onPanStart = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId)
      panDragRef.current = {
        startClientX: event.clientX,
        startClientY: event.clientY,
        originX: position.x,
        originY: position.y,
      }
    },
    [position],
  )

  const onPanMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const panDrag = panDragRef.current
    if (!panDrag) return
    setPosition({
      x: panDrag.originX + event.clientX - panDrag.startClientX,
      y: panDrag.originY + event.clientY - panDrag.startClientY,
    })
  }, [])

  const onPanEnd = useCallback(() => {
    panDragRef.current = null
  }, [])

  return {
    scale,
    position,
    containerRef,
    zoomIn,
    zoomOut,
    reset,
    centerOn,
    onWheel,
    onPanStart,
    onPanMove,
    onPanEnd,
  }
}
