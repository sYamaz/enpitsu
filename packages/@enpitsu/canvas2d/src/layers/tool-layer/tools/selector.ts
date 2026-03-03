import { Simple2DCatmullRomSpline } from '@syamaz/catmull-rom-spline'
import { StrokeStore } from 'store/stroke-store'
import { BasicTool } from './_basic'
import { ViewportTransformer } from 'transformer/viewport-transformer'
import { CurrentStroke, InputPoint, Pen, Stroke, Selection, Point, ToolRenderState } from 'types'

type SelectorState =
    | { type: 'idle' }
    | { type: 'drawing'; stroke: CurrentStroke }
    | { type: 'selected'; selection: Selection }
    | { type: 'dragging'; selection: Selection; origin: Point }

export class SelectorTool extends BasicTool {
    private readonly model: StrokeStore
    private readonly spline = new Simple2DCatmullRomSpline()
    private readonly splinePoints = 10
    private state: SelectorState = { type: 'idle' }

    private readonly pen: Pen = {
        r: 0,
        g: 0,
        b: 255,
        maxThickness: 2,
        minThickness: 2,
        maxColorRatio: 0.5,
        minColorRatio: 0.5,
    }

    constructor(transformer: ViewportTransformer, model: StrokeStore) {
        super(transformer)
        this.model = model
    }

    getRenderState(): ToolRenderState {
        if (this.state.type === 'drawing') {
            return { tool: 'selector_drawing', points: this.state.stroke.points, pen: this.pen }
        }
        if (this.state.type === 'selected' || this.state.type === 'dragging') {
            const { left, right, top, bottom } = this.state.selection.selectedBBox
            return { tool: 'selector_selected', bbox: { left, right, top, bottom } }
        }
        return { tool: 'idle' }
    }

    protected _onPointerDown(rawPoint: InputPoint): void {
        if (this.state.type === 'selected') {
            const { selection } = this.state
            const contain = (selection.selectedBBox.left <= rawPoint.x) &&
                (selection.selectedBBox.right >= rawPoint.x) &&
                (selection.selectedBBox.top <= rawPoint.y) &&
                (selection.selectedBBox.bottom >= rawPoint.y)

            if (contain) {
                this.state = { type: 'dragging', selection, origin: { x: rawPoint.x, y: rawPoint.y } }
                return
            }
        }

        this.state = {
            type: 'drawing',
            stroke: {
                pen: this.pen,
                points: [],
                needRender: true,
                waitCalcPoints: [],
                bbox: { left: rawPoint.x, right: rawPoint.x, top: rawPoint.y, bottom: rawPoint.y }
            }
        }
        this._addPoint(rawPoint)
    }

    protected _onPointerMove(rawPoint: InputPoint, isPointerDown: boolean): void {
        if (!isPointerDown) return

        if (this.state.type === 'dragging') {
            const dx = rawPoint.x - this.state.origin.x
            const dy = rawPoint.y - this.state.origin.y
            this.state.origin = { x: rawPoint.x, y: rawPoint.y }

            const { selection } = this.state
            selection.selectedStrokes = selection.selectedStrokes.map(stroke => {
                const offset = stroke.offset ?? { x: 0, y: 0 }
                return {
                    ...stroke,
                    offset: { x: offset.x + dx, y: offset.y + dy }
                }
            })
            selection.selectedBBox.top += dy
            selection.selectedBBox.bottom += dy
            selection.selectedBBox.left += dx
            selection.selectedBBox.right += dx
            this.model.updateConfirmedStrokes([...selection.unselectedStrokes, ...selection.selectedStrokes])
            return
        }

        if (this.state.type === 'drawing') {
            this._addPoint(rawPoint)
        }
    }

    protected _onPointerUp(rawPoint: InputPoint): void {
        if (this.state.type === 'dragging') {
            const { selection } = this.state
            // offset を points に焼き込む（他ツールが offset を意識しなくて済むよう）
            const committed = selection.selectedStrokes.map(s => ({
                ...s,
                points: s.points.map(p => ({
                    ...p,
                    x: p.x + (s.offset?.x ?? 0),
                    y: p.y + (s.offset?.y ?? 0),
                })),
                offset: undefined,
                bbox: undefined,
            }))
            this.model.updateConfirmedStrokes([...selection.unselectedStrokes, ...committed])
            this.state = { type: 'selected', selection: { ...selection, selectedStrokes: committed } }
            return
        }

        if (this.state.type !== 'drawing') return

        this._addPoint(rawPoint)

        const { stroke } = this.state
        const pendingPoints = stroke.waitCalcPoints
        // 最後は p, INTERPORATE_POINTS, p, pとなってるはず
        const p0 = stroke.points[stroke.points.length - 1 - this.splinePoints]
        const p1 = pendingPoints[0]
        const p2 = pendingPoints[1]
        const p3 = pendingPoints[1]

        const dp = (p2.pressure - p1.pressure) / this.splinePoints
        const ps = this.spline.interpolate(p0, p1, p2, p3, 0.5, this.splinePoints)
        const points: InputPoint[] = ps.map((p, i) => {
            return {
                x: p.x,
                y: p.y,
                pressure: p1.pressure + dp * i,
                tags: ['spline'],
            }
        })
        stroke.points.push(p1, ...points, p2)
        stroke.waitCalcPoints.splice(0)

        // 選択範囲を計算
        const selection = this.getSelection(this.model.strokes, stroke)
        this.state = { type: 'selected', selection }
    }

    protected _addPoint = (rawPoint: InputPoint): void => {
        if (this.state.type !== 'drawing') {
            throw new Error("state is not drawing")
        }
        const { stroke } = this.state
        const pendingPoints = stroke.waitCalcPoints

        if (stroke.points.length === 0) {
            if (pendingPoints.length < 2) {
                // stroke1点目、2点目の時はバッファに追加して終わり
                stroke.waitCalcPoints.push(rawPoint)
                return
            } else if (pendingPoints.length === 2) {
                // 3点目の場合は、0, 0, 1, currentでspline補間を行い、補間点を取得する
                const p0 = pendingPoints.shift()!
                const p1 = p0
                const p2 = pendingPoints[0]
                const p3 = rawPoint

                const dp = (p2.pressure - p1.pressure) / this.splinePoints
                const ps = this.spline.interpolate(p0, p1, p2, p3, 0.5, this.splinePoints)
                const points: InputPoint[] = ps.map((p, i) => {
                    return {
                        x: p.x,
                        y: p.y,
                        pressure: p1.pressure + dp * i,
                        tags: ["spline"],
                    }
                })

                stroke.points.push(p1, ...points)
                stroke.waitCalcPoints.push(rawPoint)
                return
            }
        }

        const p0 = stroke.points[stroke.points.length - 1 - this.splinePoints]
        const p1 = pendingPoints.shift()!
        const p2 = pendingPoints[0]
        const p3 = rawPoint

        const dp = (p2.pressure - p1.pressure) / this.splinePoints
        const ps = this.spline.interpolate(p0, p1, p2, p3, 0.5, this.splinePoints)
        const points: InputPoint[] = ps.map((p, i) => {
            return {
                x: p.x,
                y: p.y,
                pressure: p1.pressure + dp * i,
                tags: ["spline"],
            }
        })

        stroke.points.push(p1, ...points)
        stroke.waitCalcPoints.push(rawPoint)
    }


    /**
     * 選択範囲と交差するストロークを返す
     */
    getSelection = (strokes: Stroke[], selectionStroke: Stroke): Selection => {
        const polygon = selectionStroke.points

        const selection: Selection = {
            selectedStrokes: [],
            unselectedStrokes: [],
            selectedBBox: {
                left: selectionStroke.bbox!.left,
                right: selectionStroke.bbox!.right,
                top: selectionStroke.bbox!.top,
                bottom: selectionStroke.bbox!.bottom,
                offsetX: 0,
                offsetY: 0
            }
        }

        strokes.forEach(stroke => {
            const hasPointInside = stroke.points.some(p => this.isPointInPolygon(p, polygon))
            if (hasPointInside) {
                selection.selectedStrokes.push(stroke)
                return
            }

            const intersects = stroke.points.some((pi, i) => {
                const pj = stroke.points[i + 1]
                if (!pj) return false

                return polygon.some((pk, k) => {
                    const pl = polygon[(k + 1) % polygon.length]
                    return this.segmentsIntersect(pi, pj, pk, pl)
                })
            })

            if (intersects) {
                selection.selectedStrokes.push(stroke)
                return
            }

            selection.unselectedStrokes.push(stroke)
        })

        // selectionのbboxを計算
        const xs = selection.selectedStrokes.flatMap(s => s.points.map(p => p.x))
        const ys = selection.selectedStrokes.flatMap(s => s.points.map(p => p.y))
        if (xs.length > 0 && ys.length > 0) {
            selection.selectedBBox.left = Math.min(...xs)
            selection.selectedBBox.right = Math.max(...xs)
            selection.selectedBBox.top = Math.min(...ys)
            selection.selectedBBox.bottom = Math.max(...ys)
        }

        return selection
    }


    /**
     * 線分同士の交差判定
     */
    segmentsIntersect = (p1: Point, p2: Point, p3: Point, p4: Point): boolean => {
        const dx1 = p2.x - p1.x, dy1 = p2.y - p1.y
        const dx2 = p4.x - p3.x, dy2 = p4.y - p3.y
        const denom = dx1 * dy2 - dy1 * dx2
        if (denom === 0) return false // 平行
        const t = ((p3.x - p1.x) * dy2 - (p3.y - p1.y) * dx2) / denom
        const u = ((p3.x - p1.x) * dy1 - (p3.y - p1.y) * dx1) / denom
        return t >= 0 && t <= 1 && u >= 0 && u <= 1
    }

    /**
    * 点がポリゴン内にあるか判定（Ray casting法）
    */
    isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
        let inside = false
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y
            const xj = polygon[j].x, yj = polygon[j].y
            const intersect = ((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)
            if (intersect) inside = !inside
        }
        return inside
    }
}
