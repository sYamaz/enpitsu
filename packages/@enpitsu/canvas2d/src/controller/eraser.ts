import { StrokeStore } from "store/stroke-store"
import { ViewportTransformer } from "transformer/viewport-transformer"
import { Controller, InputPoint, Point, Stroke } from "types"

export interface EraserConfig {
    size: number
    afterStartInput: () => void
    afterEndInput: () => void
    beforeAddInputPoint: () => void
    afterAddInputPoint: () => void
}

export const useEraser = (
    offscreenCanvas: OffscreenCanvas,
    transformer: ViewportTransformer,
    model: StrokeStore,
    config: Partial<EraserConfig>): Controller => {
    const ctx = offscreenCanvas.getContext('2d')!

    const determinedConfig: EraserConfig = {
        size: config.size ?? 20,
        afterStartInput: config.afterStartInput ?? (() => { }),
        afterEndInput: config.afterEndInput ?? (() => { }),
        afterAddInputPoint: config.afterAddInputPoint ?? (() => { }),
        beforeAddInputPoint: config.beforeAddInputPoint ?? (() => { })
    }

    return {
        startInput: (viewportPoint: InputPoint) => {
            startInput(determinedConfig)
            determinedConfig.afterStartInput()
        },
        endInput: (viewportPoint: InputPoint) => {
            endInput(determinedConfig)
            determinedConfig.afterEndInput()
        },
        addInputPoint: (viewportPoint: InputPoint) => {
            determinedConfig.beforeAddInputPoint()
            addInputPoint(ctx, viewportPoint, model, transformer, determinedConfig)
            determinedConfig.afterAddInputPoint()
        }
    }
}

const startInput = (config: EraserConfig) => {
    // 何もしない
}

const endInput = (config: EraserConfig) => {
    // 何もしない
}

const addInputPoint = (ctx: OffscreenCanvasRenderingContext2D, viewportInput: InputPoint, model: StrokeStore, transformer: ViewportTransformer, config: EraserConfig) => {
    // viewport座標からraw座標(絶対座標)に変換する
    const rendererMatrix = new DOMMatrix(transformer.getTransformForController())
    const controllerMatrix = rendererMatrix.inverse()

    const { x, y } = controllerMatrix.transformPoint(new DOMPoint(viewportInput.x, viewportInput.y))
    const rawInputPoint: InputPoint = {
        x,
        y,
        pressure: viewportInput.pressure,
        tags: viewportInput.tags
    }

    // render
    const [a, b, c, d, e, f] = transformer.getTransformForRender()
    const matrix = new DOMMatrix()
    matrix.a = a
    matrix.b = b
    matrix.c = c
    matrix.d = d
    matrix.e = e
    matrix.f = f
    ctx.setTransform(matrix)
    const path = new Path2D()
    path.arc(rawInputPoint.x, rawInputPoint.y, config.size, 0, 2 * Math.PI)
    path.closePath()
    ctx.stroke(path)

    const strokes = model.getConfirmedStrokes()
    const modifiedStrokes = eraseAt(strokes, rawInputPoint, config.size)
    model.updateConfirmedStrokes(modifiedStrokes)
}

/**
 * 線分と円の交差点を求める
 * @returns 交差点の配列（0~2点）、tは線分上の位置（0~1）
 */
const getSegmentCircleIntersections = (
    p1: InputPoint,
    p2: InputPoint,
    center: Point,
    radius: number
): { point: InputPoint; t: number }[] => {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y

    const fx = p1.x - center.x
    const fy = p1.y - center.y

    const a = dx * dx + dy * dy
    if (a === 0) {
        // p1 === p2の場合は点と円の判定
        const dist = Math.hypot(p1.x - center.x, p1.y - center.y)
        if (dist <= radius) {
            return [{ point: p1, t: 0 }]
        }
        return []
    }
    const b = 2 * (fx * dx + fy * dy)
    const c = fx * fx + fy * fy - radius * radius

    const discriminant = b * b - 4 * a * c
    if (discriminant < 0) return [] // 交差なし

    const results: { point: InputPoint; t: number }[] = []
    const sqrtD = Math.sqrt(discriminant)

    for (const t of [(-b - sqrtD) / (2 * a), (-b + sqrtD) / (2 * a)]) {
        if (t < 0 || t > 1) continue // 線分の外

        // 交差点のInputPointを補間で求める
        results.push({
            t,
            point: {
                x: p1.x + t * dx,
                y: p1.y + t * dy,
                pressure: p1.pressure + t * (p2.pressure - p1.pressure),
                tags: p1.tags
            }
        })
    }

    return results
}

/**
 * 消しゴム円でストロークを分割する
 * @returns 分割後のストローク配列（消しゴムで消えた部分は除去済み）
 */
const splitStrokeByEraser = (
    stroke: Stroke,
    center: Point,
    radius: number
): Stroke[] => {
    const result: Stroke[] = []
    let currentPoints: InputPoint[] = []
    let hasIntersection = false

    const isInside = (p: Point) => {
        if (!isFinite(p.x) || !isFinite(p.y)) return false
        return (p.x - center.x) ** 2 + (p.y - center.y) ** 2 <= radius * radius
    }

    for (let i = 0; i < stroke.points.length; i++) {
        const pi = stroke.points[i]
        const pj = stroke.points[i + 1]

        if (!isInside(pi)) {
            currentPoints.push(pi)
        } else {
            hasIntersection = true
        }

        if (!pj) continue

        const intersections = getSegmentCircleIntersections(pi, pj, center, radius)
        intersections.sort((a, b) => a.t - b.t)

        for (const { point } of intersections) {
            hasIntersection = true
            if (isInside(pi)) {
                // 円の外に出る → 新しいストローク開始
                currentPoints = [point]
            } else {
                // 円の中に入る → 現在のストローク終了
                currentPoints.push(point)
                if (currentPoints.length >= 2) {
                    result.push({ ...stroke, points: currentPoints, waitRenderPoints: [], waitCalcPoints: [], bbox: undefined })
                }
                currentPoints = []
            }
        }
    }

    // 交差なしはそのまま返す
    if (!hasIntersection) return [stroke]

    // 残ったpointsを追加
    if (currentPoints.length >= 2) {
        result.push({ ...stroke, points: currentPoints, waitRenderPoints: [], waitCalcPoints: [], bbox: undefined })
    }

    return result
}

const eraseAt = (strokes: Stroke[], center: Point, radius: number): Stroke[] => {
    return strokes.flatMap(stroke => {
        if (stroke.bbox) {
            const intersectsBBox = !(
                stroke.bbox.right < center.x - radius ||
                stroke.bbox.left > center.x + radius ||
                stroke.bbox.bottom < center.y - radius ||
                stroke.bbox.top > center.y + radius
            )
            if (!intersectsBBox) return [stroke]
        }

        return splitStrokeByEraser(stroke, center, radius)
    })
}