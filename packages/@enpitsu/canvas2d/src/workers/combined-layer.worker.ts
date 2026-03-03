/// <reference lib="webworker" />
import { renderJoint, renderSegment } from '../renderer/segment'
import type { CombinedWorkerInMessage, StrokeSnapshot, TransformSnapshot } from './combined-layer.worker.types'

let ctx: OffscreenCanvasRenderingContext2D | null = null

addEventListener('message', (event: MessageEvent) => {
    const msg = event.data as CombinedWorkerInMessage
    if (msg.type === 'init') {
        ctx = msg.canvas.getContext('2d')!
        return
    }
    if (msg.type === 'render') {
        if (!ctx) return
        if (msg.needClear) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
        }
        for (const stroke of msg.strokes) {
            if (!msg.needClear && !stroke.needRender) continue
            __renderStroke(ctx, stroke, msg.transform)
        }
        ;(self as unknown as DedicatedWorkerGlobalScope).postMessage({ type: 'render_done' })
    }
})

const __renderStroke = (
    ctx: OffscreenCanvasRenderingContext2D,
    stroke: StrokeSnapshot,
    transform: TransformSnapshot
) => {
    const matrix = new DOMMatrix()
    matrix.a = transform.a
    matrix.b = transform.b
    matrix.c = transform.c
    matrix.d = transform.d
    matrix.e = transform.e
    matrix.f = transform.f
    ctx.setTransform(matrix)

    if (stroke.points.length > 0) {
        let prev = { ...stroke.points[0] }
        prev.x += stroke.offset?.x ?? 0
        prev.y += stroke.offset?.y ?? 0
        renderJoint(ctx, prev, stroke.pen)
        stroke.points.slice(1).forEach(p => {
            const current = { ...p }
            current.x += stroke.offset?.x ?? 0
            current.y += stroke.offset?.y ?? 0
            renderSegment(ctx, prev, current, stroke.pen)
            renderJoint(ctx, current, stroke.pen)
            prev = current
        })
    }
}
