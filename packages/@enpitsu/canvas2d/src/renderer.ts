import { SimpleStore } from "store";
import { ViewportTransformer } from "./transformer";
import type { InputPoint, Pen, Point, Renderer, Stroke } from "./types";

export const useRenderer = (offscreenCanvas: OffscreenCanvas, transformer: ViewportTransformer, model: SimpleStore): Renderer => {
    const ctx = offscreenCanvas.getContext('2d', {
        antialias: true,
        desynchronized: false
    })!

    return {
        clear: () => {
            ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)
        },
        renderAll: () => {
            _renderAll(ctx, model, transformer)
        },
        requestRenderAll: (rendered?: () => void) => {
            return requestAnimationFrame(() => {
                ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)
                _renderAll(ctx, model, transformer)
                rendered?.()
            })
        },
        renderCurrentStroke: () => {
            _renderCurrentStroke(ctx, model, transformer)
        },
        requestRenderCurrentStroke: (rendered?: () => void) => {
            return requestAnimationFrame(() => {
                _renderCurrentStroke(ctx, model, transformer)
                rendered?.()
            })
        },
        renderConfirmedStrokes: () => {
            _renderConfirmedStrokes(ctx, model, transformer)
        },
        requestRenderConfirmedStrokes: (rendered?: () => void) => {
            requestAnimationFrame(() => {
                _renderConfirmedStrokes(ctx, model, transformer)
                rendered?.()
            })
        }
    }
}

/**
 * 書き込み中ストロークを描画します
 * @param offscreenCanvas 
 * @param model 
 */
const _renderCurrentStroke = (ctx: OffscreenCanvasRenderingContext2D, model: SimpleStore, transformer: ViewportTransformer) => {
    const stroke = model.getCurrentStroke()
    if (!stroke) {
        return
    }

    

    // 描画待ちのpointを取得
    if (stroke.waitRenderPoints.length === 0) {
        return
    }

    // 描画完了際終点と描画待ちの最初の点を繋ぐ
    __renderStroke(ctx, stroke, transformer, true)

    // 描画待ちのpointを描画後バッファに追加
    stroke.points.push(...stroke.waitRenderPoints)
    stroke.waitRenderPoints.splice(0)
    model.updateCurrentStroke(stroke)
}

/**
 * 確定済みストロークを描画します
 * @param offscreenCanvas 
 * @param model 
 */
const _renderConfirmedStrokes = (ctx: OffscreenCanvasRenderingContext2D, model: SimpleStore, transformer: ViewportTransformer) => {
    const strokes = model.getWaitRenderStrokes()
    strokes.forEach(stroke => {
        __renderStroke(ctx, stroke, transformer)
    })

    const newStrokes = model.getConfirmedStrokes()
    newStrokes.push(...strokes)
    model.updateConfirmedStrokes(newStrokes)
}

/**
 * 書き込み中ストロークと確定済みストロークを描画します
 * @param ctx 
 * @param model 
 */
const _renderAll = (ctx: OffscreenCanvasRenderingContext2D, model: SimpleStore, transformer: ViewportTransformer) => {
    const strokes = model.getConfirmedStrokes()
    const full = [...strokes]
    const current = model.getCurrentStroke()
    if (current) {
        full.push(current)
    }

    full.forEach(stroke => {
        __renderStroke(ctx, stroke, transformer)
    })
}

/**
 * ストロークを描画します
 * @param ctx 
 * @param stroke 
 */
const __renderStroke = (ctx: OffscreenCanvasRenderingContext2D, stroke: Stroke, transformer: ViewportTransformer, unrenderedOnly = false) => {
    if (stroke.points.length === 0) {
        return
    }

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

    if (unrenderedOnly) {
        // 描画済みの最後の点と、未描画の最初の点とを繋ぐ
        ___renderSegment(
            ctx,
            stroke.points[stroke.points.length - 1],
            stroke.waitRenderPoints[0],
            stroke.pen
        )
        // strokeの描画
        ___renderJoint(ctx, stroke.waitRenderPoints[0], stroke.pen)
        let prev = stroke.waitRenderPoints[0]
        stroke.waitRenderPoints.slice(1).forEach((current) => {
            ___renderSegment(ctx, prev, current, stroke.pen)
            prev = current
        })
    } else {
        // strokeの描画
        ___renderJoint(ctx, stroke.points[0], stroke.pen)
        let prev = stroke.points[0]
        stroke.points.slice(1).forEach((current) => {
            ___renderSegment(ctx, prev, current, stroke.pen)
            prev = current
        })
    }
}

const ___renderJoint = (ctx: OffscreenCanvasRenderingContext2D, p: InputPoint, pen: Pen) => {

    ctx.fillStyle = colorStyleFromPen(p.pressure, pen)
    ctx.lineWidth = 0
    ctx.beginPath()
    ctx.arc(p.x, p.y, radiusFromPen(p.pressure, pen) - 0.5, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fill()

}

const ___renderSegment = (ctx: OffscreenCanvasRenderingContext2D, pi: InputPoint, pj: InputPoint, pen: Pen) => {

    const gradient = ctx.createLinearGradient(pi.x, pi.y, pj.x, pj.y)
    gradient.addColorStop(0, colorStyleFromPen(pi.pressure, pen))
    gradient.addColorStop(1, colorStyleFromPen(pj.pressure, pen))
    ctx.fillStyle = gradient
    ctx.lineWidth = 0

    // segment(台形)の描画
    const normal = getNormal(pi, pj)
    const pi_radius = radiusFromPen(pi.pressure, pen)
    const pj_radius = radiusFromPen(pj.pressure, pen)
    ctx.beginPath()
    ctx.moveTo(pi.x + normal.x * pi_radius, pi.y + normal.y * pi_radius)
    ctx.lineTo(pi.x - normal.x * pi_radius, pi.y - normal.y * pi_radius)
    ctx.lineTo(pj.x - normal.x * pj_radius, pj.y - normal.y * pj_radius)
    ctx.lineTo(pj.x + normal.x * pj_radius, pj.y + normal.y * pj_radius)
    ctx.closePath()

    ctx.fill()

    ___renderJoint(ctx, pj, pen)
}

const radiusFromPen = (pressure: number, pen: Pen) => {
    const radius = pen.minThickness + pressure * (pen.maxThickness - pen.minThickness)
    return radius
}

const colorStyleFromPen = (pressure: number, pen: Pen) => {
    const ratio = pen.minColorRatio + pressure * (pen.maxColorRatio - pen.minColorRatio)

    const r = pen.r * ratio
    const g = pen.g * ratio
    const b = pen.b * ratio

    return `rgba(${r},${g},${b},1)`
}

/**
 * ２点間の法線ベクトルを求める
 * @param pi 
 * @param pj 
 * @returns 
 */
const getNormal = (pi: Point, pj: Point): { x: number, y: number } => {
    const dx = pj.x - pi.x;
    const dy = pj.y - pi.y;
    const invLen = 1 / Math.sqrt(dx * dx + dy * dy);

    return {
        x: -dy * invLen,
        y: dx * invLen
    };
}