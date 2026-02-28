import { renderJoint, renderSegment } from "../../renderer";
import { StrokeStore } from "../../store";
import { ViewportTransformer } from "../../transformer";
import { Stroke } from "types";

export const useCombinedLayerRenderer = (
    canvas: HTMLCanvasElement, 
    transformer: ViewportTransformer,
    store: StrokeStore
) => {
    const offscreen = canvas.transferControlToOffscreen()
    const ctx = offscreen.getContext('2d')!

    return {
        render: () => {
            render(ctx, store, transformer)
        },
        requestRender: (rendered?: () => void) => {
            requestAnimationFrame(() => {
                render(ctx, store, transformer)
                rendered?.()
            })
        }
    }
}


/**
 * 確定済みストロークを描画します
 * @param offscreenCanvas 
 * @param model 
 */
const render = (ctx: OffscreenCanvasRenderingContext2D, model: StrokeStore, transformer: ViewportTransformer) => {
    if(model.needClear) { // クリアが必要な場合はクリアする
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    }
    model.needClear = false

    // 未描画のストロークを取得し、描画する
    model.forEachStroke(stroke => {
        __renderStroke(ctx, stroke, transformer)
        return {
            ...stroke,
            needRender: false // 描画したので、needRenderをfalseにする
        }
    })
}

/**
 * ストロークを描画します
 * @param ctx 
 * @param stroke 
 */
const __renderStroke = (ctx: OffscreenCanvasRenderingContext2D, stroke: Stroke, transformer: ViewportTransformer, unrenderedOnly = false) => {
    // matrixの反映

    const [a, b, c, d, e, f] = transformer.getTransformForRender()
    const matrix = new DOMMatrix()
    matrix.a = a
    matrix.b = b
    matrix.c = c
    matrix.d = d
    matrix.e = e
    matrix.f = f
    ctx.setTransform(matrix)

    if (stroke.points.length > 0) {
        // strokeの描画
        let prev = {
            ...stroke.points[0]
        } 
        prev.x += stroke.offset?.x ?? 0
        prev.y += stroke.offset?.y ?? 0
        renderJoint(ctx, prev, stroke.pen)
        stroke.points.slice(1).forEach((p) => {
            const current = {
                ...p
            }
            current.x += stroke.offset?.x ?? 0
            current.y += stroke.offset?.y ?? 0
            
            renderSegment(ctx, prev, current, stroke.pen)
            renderJoint(ctx, current, stroke.pen)
            prev = current
        })
    }
}