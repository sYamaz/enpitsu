import { StrokeStore } from 'store/stroke-store'
import { BasicTool } from './_basic'
import { ViewportTransformer } from 'transformer/viewport-transformer'
import { InputPoint, Point, Stroke, ToolRenderState } from 'types'

export class EraserTool extends BasicTool {
    size: number = 20
    private cursor: InputPoint | null = null
    private readonly model: StrokeStore

    constructor(transformer: ViewportTransformer, model: StrokeStore) {
        super(transformer)
        this.model = model
    }

    getRenderState(): ToolRenderState {
        return { tool: 'eraser', cursor: this.cursor, size: this.size }
    }

    protected _onPointerDown = (rawPoint: InputPoint): void => {
        this.cursor = rawPoint
    }

    protected _onPointerMove = (rawPoint: InputPoint, isPointerDown: boolean): void => {
        if(!isPointerDown) return

        this.cursor = rawPoint

        const stroke = this.model.strokes
        const modifiedStrokes = eraseAt(stroke, rawPoint, this.size)
        this.model.updateConfirmedStrokes(modifiedStrokes)
    }
    protected _onPointerUp = (rawPoint: InputPoint): void => {
        this.cursor = null
    }

    protected _cancel = (): void => {
        this.cursor = null
    }
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
                tags: p1.tags,
                timestamp: 0,
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
                    result.push({ ...stroke, points: currentPoints, bbox: undefined })
                }
                currentPoints = []
            }
        }
    }

    // 交差なしはそのまま返す
    if (!hasIntersection) return [stroke]

    // 残ったpointsを追加
    if (currentPoints.length >= 2) {
        result.push({ ...stroke, points: currentPoints, bbox: undefined })
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