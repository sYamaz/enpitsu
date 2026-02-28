import { Simple2DCatmullRomSpline } from "@syamaz/catmull-rom-spline";
import { renderJoint, renderSegment } from "../../../renderer/segment";
import { StrokeStore } from "store/stroke-store";
import { BasicTool } from "./_basic";
import { ViewportTransformer } from "transformer/viewport-transformer";
import { CurrentStroke, InputPoint, Pen, Stroke, Selection, Point } from "types";

export class SelectorTool extends BasicTool {
    private readonly model: StrokeStore
    private readonly spline = new Simple2DCatmullRomSpline()
    private readonly splinePoints = 10
    private stroke: CurrentStroke | null = null
    private selection: Selection | null = null
    private offsetBaseX: number = 0
    private offsetBaseY: number = 0

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

    protected _render(ctx: OffscreenCanvasRenderingContext2D): void {
        if (this.stroke) {
            // 描画待ちのpointを取得
            if (this.stroke.waitRenderPoints.length === 0) {
                return
            }

            // 描画完了際終点と描画待ちの最初の点を繋ぐ
            this.__renderStroke(ctx, this.stroke)

            // 描画待ちのpointを描画後バッファに追加
            this.stroke.points.push(...this.stroke.waitRenderPoints)
            this.stroke.waitRenderPoints.splice(0)
        }

        if (this.selection) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

            const { left, right, top, bottom } = this.selection.selectedBBox
            ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)'
            ctx.lineWidth = 1
            ctx.setLineDash([5, 5])
            ctx.strokeRect(left, top, right - left, bottom - top)
            ctx.setLineDash([])
        }
    }

    protected _onPointerDown(rawPoint: InputPoint): void {
        if(this.selection) {
            // rawPointがselection.bboxに含まれているか
            const contain = (this.selection.selectedBBox.left <= rawPoint.x) &&
            (this.selection.selectedBBox.right >= rawPoint.x) &&
            (this.selection.selectedBBox.top <= rawPoint.y) &&
            (this.selection.selectedBBox.bottom >= rawPoint.y)

            if(contain) {
                this.offsetBaseX = rawPoint.x
                this.offsetBaseY = rawPoint.y
                return
            }
        }

        this.selection = null
        this.stroke = {
            pen: this.pen,
            points: [],
            needRender: true,
            waitCalcPoints: [],
            waitRenderPoints: [],
            bbox: { left: rawPoint.x, right: rawPoint.x, top: rawPoint.y, bottom: rawPoint.y }
        }

        this._addPoint(rawPoint)
    }
    protected _onPointerMove(rawPoint: InputPoint, isPointerDown: boolean): void {
        if(!isPointerDown) return

        if(this.selection) {
            const dx = rawPoint.x - this.offsetBaseX
            const dy = rawPoint.y - this.offsetBaseY
            this.offsetBaseY = rawPoint.y
            this.offsetBaseX = rawPoint.x
            this.selection.selectedStrokes = this.selection.selectedStrokes.map(stroke => {
                const offset = stroke.offset ?? {
                    x: 0,
                    y: 0
                }

                offset.x += dx
                offset.y += dy

                return {
                    ...stroke,
                    offset
                }
            })
            this.selection.selectedBBox.top += dy
            this.selection.selectedBBox.bottom += dy
            this.selection.selectedBBox.left += dx
            this.selection.selectedBBox.right += dx
            this.model.updateConfirmedStrokes([...this.selection.unselectedStrokes, ...this.selection.selectedStrokes])
            return
        }

        this._addPoint(rawPoint)
    }
    protected _onPointerUp(rawPoint: InputPoint): void {
        if(this.selection) {
            return
        }

        this._addPoint(rawPoint)

        if (!this.stroke) {
            throw new Error("stroke is null")
        }
        const pendingPoints = this.stroke.waitCalcPoints
        // 最後は p, INTERPORATE_POINTS, p, pとなってるはず
        const p0 = this.stroke.points[this.stroke.points.length - 1 - this.splinePoints]
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
        this.stroke.waitRenderPoints.push(p1, ...points, p2)
        this.stroke.waitCalcPoints.splice(0)

        // 選択範囲を計算
        this.selection = this.getSelection(this.model.strokes, this.stroke)
        this.stroke = null
    }

    protected _addPoint = (rawPoint: InputPoint): void => {
        if (!this.stroke) {
            throw new Error("stroke is null")
        }
        const pendingPoints = this.stroke.waitCalcPoints

        if (this.stroke.points.length === 0) {
            if (pendingPoints.length < 2) {
                // stroke1点目、2点目の時はバッファに追加して終わり
                this.stroke.waitCalcPoints.push(rawPoint)
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

                this.stroke.waitRenderPoints.push(p1, ...points)
                this.stroke.waitCalcPoints.push(rawPoint)
                return
            }
        }

        const p0 = this.stroke.points[this.stroke.points.length - 1 - this.splinePoints]
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

        this.stroke.waitRenderPoints.push(p1, ...points)
        this.stroke.waitCalcPoints.push(rawPoint)
    }


    /**
     * ストロークを描画します
     * @param ctx 
     * @param stroke 
     */
    __renderStroke = (ctx: OffscreenCanvasRenderingContext2D, stroke: CurrentStroke) => {
        if (stroke.points.length > 0) {
            // 描画済みの最後の点と、未描画の最初の点とを繋ぐ
            renderSegment(
                ctx,
                stroke.points[stroke.points.length - 1],
                stroke.waitRenderPoints[0],
                stroke.pen
            )
            renderJoint(ctx, stroke.waitRenderPoints[0], stroke.pen)
        }

        // strokeの描画
        renderJoint(ctx, stroke.waitRenderPoints[0], stroke.pen)
        let prev = stroke.waitRenderPoints[0]
        stroke.waitRenderPoints.slice(1).forEach((current) => {
            renderSegment(ctx, prev, current, stroke.pen)
            renderJoint(ctx, current, stroke.pen)
            prev = current
        })
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