/// <reference lib="webworker" />
import { buildStrokeRenderData } from '../renderer/segment'
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

    const data = buildStrokeRenderData(ctx, stroke.points, stroke.pen, stroke.offset)
    if (!data) return
    ctx.fillStyle = data.fillStyle
    ctx.fill(data.path)
}
