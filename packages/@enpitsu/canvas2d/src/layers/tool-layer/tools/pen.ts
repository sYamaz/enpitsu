import { Simple2DCatmullRomSpline } from "@syamaz/catmull-rom-spline";
import { renderJoint, renderSegment } from "../../../renderer";
import { StrokeStore } from "store/stroke-store";
import { BasicTool } from "./_basic";
import { ViewportTransformer } from "transformer/viewport-transformer";
import { CurrentStroke, InputPoint, Pen } from "types";

export class PenTool extends BasicTool {
    protected stroke: CurrentStroke | null = null
    private readonly spline = new Simple2DCatmullRomSpline()
    private readonly splinePoints = 10
    private readonly store: StrokeStore

    pen: Pen = {
        r: 50,
        g: 50,
        b: 50,
        maxThickness: 0.5,
        minThickness: 4,
        maxColorRatio: 1,
        minColorRatio: 0.5
    }

    constructor(transformer: ViewportTransformer, store: StrokeStore) {
        super(transformer)
        this.store = store
    }

    protected _render = (ctx: OffscreenCanvasRenderingContext2D): void => {
        if (!this.stroke) {
            return
        }

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
    protected _onPointerDown = (rawPoint: InputPoint): void => {
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
    protected _onPointerMove = (rawPoint: InputPoint, isPointerDown: boolean): void => {
        if (!isPointerDown) return

        this._addPoint(rawPoint)
    }
    protected _onPointerUp = (rawPoint: InputPoint): void => {
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
        this.store.pushStrokes(this.stroke)
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
}