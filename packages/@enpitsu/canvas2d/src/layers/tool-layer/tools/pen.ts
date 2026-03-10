import { Simple2DCatmullRomSpline } from '@syamaz/catmull-rom-spline'
import { StrokeStore } from 'store/stroke-store'
import { BasicTool } from './_basic'
import { ViewportTransformer } from 'transformer/viewport-transformer'
import { CurrentStroke, InputPoint, Pen, ToolRenderState } from 'types'

type PenState =
    | { type: 'idle' }
    | { type: 'drawing'; stroke: CurrentStroke }

export class PenTool extends BasicTool {
    private state: PenState = { type: 'idle' }
    private readonly spline = new Simple2DCatmullRomSpline()
    private readonly splinePoints = 10
    private readonly store: StrokeStore

    pen: Pen = {
        r: 50,
        g: 50,
        b: 50,
        alpha: 0.9,
        maxThickness: 3,
        minThickness: 0.25,
        maxColorRatio: 1,
        minColorRatio: 0.95
    }

    constructor(transformer: ViewportTransformer, store: StrokeStore) {
        super(transformer)
        this.store = store
    }

    getRenderState(): ToolRenderState {
        if (this.state.type !== 'drawing') return { tool: 'idle' }
        return { tool: 'pen', points: this.state.stroke.points, pen: this.pen }
    }

    protected _onPointerDown = (rawPoint: InputPoint): void => {
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

    protected _onPointerMove = (rawPoint: InputPoint, isPointerDown: boolean): void => {
        if (!isPointerDown) return
        this._addPoint(rawPoint)
    }

    protected _cancel = (): void => {
        this.state = { type: 'idle' }
    }

    protected _onPointerUp = (rawPoint: InputPoint): void => {
        this._addPoint(rawPoint)

        if (this.state.type !== 'drawing') {
            throw new Error('state is not drawing')
        }
        const { stroke } = this.state
        const pendingPoints = stroke.waitCalcPoints
        const p0 = stroke.points[stroke.points.length - 1 - this.splinePoints]
        const p1 = pendingPoints[0]
        const p2 = pendingPoints[1]
        const p3 = pendingPoints[1]

        const dp = (p2.pressure - p1.pressure) / this.splinePoints
        const dt = (p2.timestamp - p1.timestamp) / this.splinePoints
        const ps = this.spline.interpolate(p0, p1, p2, p3, 0.5, this.splinePoints)
        const points: InputPoint[] = ps.map((p, i) => {
            return {
                x: p.x,
                y: p.y,
                pressure: p1.pressure + dp * i,
                tags: ['spline'],
                timestamp: p1.timestamp + dt * i,
            }
        })
        stroke.points.push(p1, ...points, p2)
        stroke.waitCalcPoints.splice(0)
        this.store.pushStrokes(stroke)
        this.state = { type: 'idle' }
    }

    protected _addPoint = (rawPoint: InputPoint): void => {
        if (this.state.type !== 'drawing') {
            throw new Error('state is not drawing')
        }

        const { stroke } = this.state
        const pendingPoints = stroke.waitCalcPoints

        if (stroke.points.length === 0) {
            if (pendingPoints.length < 2) {
                stroke.waitCalcPoints.push(rawPoint)
                return
            } else if (pendingPoints.length === 2) {
                const p0 = pendingPoints.shift()!
                const p1 = p0
                const p2 = pendingPoints[0]
                const p3 = rawPoint

                const dp = (p2.pressure - p1.pressure) / this.splinePoints
                const dt = (p2.timestamp - p1.timestamp) / this.splinePoints
                const ps = this.spline.interpolate(p0, p1, p2, p3, 0.5, this.splinePoints)
                const points: InputPoint[] = ps.map((p, i) => {
                    return {
                        x: p.x,
                        y: p.y,
                        pressure: p1.pressure + dp * i,
                        tags: ['spline'],
                        timestamp: p1.timestamp + dt * i,
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
        const dt = (p2.timestamp - p1.timestamp) / this.splinePoints
        const ps = this.spline.interpolate(p0, p1, p2, p3, 0.5, this.splinePoints)
        const points: InputPoint[] = ps.map((p, i) => {
            return {
                x: p.x,
                y: p.y,
                pressure: p1.pressure + dp * i,
                tags: ['spline'],
                timestamp: p1.timestamp + dt * i,
            }
        })

        stroke.points.push(p1, ...points)
        stroke.waitCalcPoints.push(rawPoint)
    }
}
