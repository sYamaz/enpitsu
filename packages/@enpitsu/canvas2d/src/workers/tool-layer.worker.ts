/// <reference lib="webworker" />
import { renderJoint, renderSegment } from '../renderer/segment'
import type { ToolRenderState, ToolWorkerInMessage, TransformSnapshot } from './tool-layer.worker.types'

let ctx: OffscreenCanvasRenderingContext2D | null = null

addEventListener('message', (event: MessageEvent) => {
    const msg = event.data as ToolWorkerInMessage
    if (msg.type === 'init') {
        ctx = msg.canvas.getContext('2d')!
        return
    }
    if (msg.type === 'clear') {
        if (!ctx) return
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
        return
    }
    if (msg.type === 'render') {
        if (!ctx) return
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
        applyTransform(ctx, msg.transform)
        drawState(ctx, msg.state)
        ;(self as unknown as DedicatedWorkerGlobalScope).postMessage({ type: 'render_done' })
    }
})

const applyTransform = (ctx: OffscreenCanvasRenderingContext2D, transform: TransformSnapshot) => {
    const matrix = new DOMMatrix()
    matrix.a = transform.a
    matrix.b = transform.b
    matrix.c = transform.c
    matrix.d = transform.d
    matrix.e = transform.e
    matrix.f = transform.f
    ctx.setTransform(matrix)
}

const drawState = (ctx: OffscreenCanvasRenderingContext2D, state: ToolRenderState) => {
    switch (state.tool) {
        case 'idle':
            break
        case 'pen': {
            if (state.points.length === 0) break
            let prev = state.points[0]
            renderJoint(ctx, prev, state.pen)
            state.points.slice(1).forEach(current => {
                renderSegment(ctx, prev, current, state.pen)
                renderJoint(ctx, current, state.pen)
                prev = current
            })
            break
        }
        case 'eraser':
        case 'remover': {
            if (!state.cursor) break
            const path = new Path2D()
            path.arc(state.cursor.x, state.cursor.y, state.size, 0, Math.PI * 2)
            ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)'
            ctx.stroke(path)
            break
        }
        case 'selector_drawing': {
            if (state.points.length === 0) break
            let prev = state.points[0]
            renderJoint(ctx, prev, state.pen)
            state.points.slice(1).forEach(current => {
                renderSegment(ctx, prev, current, state.pen)
                renderJoint(ctx, current, state.pen)
                prev = current
            })
            break
        }
        case 'selector_selected': {
            const { left, right, top, bottom } = state.bbox
            ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)'
            ctx.lineWidth = 1
            ctx.setLineDash([5, 5])
            ctx.strokeRect(left, top, right - left, bottom - top)
            ctx.setLineDash([])
            break
        }
    }
}
