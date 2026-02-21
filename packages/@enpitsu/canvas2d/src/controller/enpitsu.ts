import { SimpleStore } from "store";
import { ViewportTransformer } from "../transformer";
import { Controller, InputPoint, Pen } from "../types";
import { Simple2DCatmullRomSpline } from "@syamaz/catmull-rom-spline";

export const useEnpitsu = (transformer: ViewportTransformer, model: SimpleStore, splinePoints: number, pen: Pen): Controller => {
    const spline = new Simple2DCatmullRomSpline()
    return {
        startInput: () => {
            startStroke(pen, model)
        },
        endInput: () => {
            endStroke(model, spline, splinePoints)
        },
        addInputPoint: (viewportPoint: InputPoint) => {
            addStrokePoint(viewportPoint, transformer, model, spline, splinePoints)
        }
    }
}

const startStroke = (pen: Pen, model: SimpleStore) => {
    model.confirmCurrentStroke()

    model.updateCurrentStroke({
        pen,
        waitCalcPoints: [],
        waitRenderPoints: [],
        points: []
    })
}

const endStroke = (model: SimpleStore, spline: Simple2DCatmullRomSpline, splinePoints: number) => {
    const current = model.getCurrentStroke()
    if (!current) {
        throw new Error("current stroke missing")
    }
    const pendingPoints = current.waitCalcPoints

    // 最後は p, INTERPORATE_POINTS, p, pとなってるはず
    const p0 = current.points[current.points.length - 1 - splinePoints]
    const p1 = pendingPoints[0]
    const p2 = pendingPoints[1]
    const p3 = pendingPoints[1]

    const dp = (p2.pressure - p1.pressure) / splinePoints
    const ps = spline.interpolate(p0, p1, p2, p3, 0.5, splinePoints)
    const points: InputPoint[] = ps.map((p, i) => {
        return {
            x: p.x,
            y: p.y,
            pressure: p1.pressure + dp * i,
            tags: ['spline'],
        }
    })

    current.waitRenderPoints.push(p1, ...points, p2)
    current.waitCalcPoints.splice(0)
    model.updateCurrentStroke(current)
    model.confirmCurrentStroke()
}

const addStrokePoint = (viewportPoint: InputPoint, transformer: ViewportTransformer, model: SimpleStore, spline: Simple2DCatmullRomSpline, splinePoints: number) => {
    // viewport座標からraw座標(絶対座標)に変換する
    const rendererMatrix = new DOMMatrix(transformer.getTransformForController())
    const controllerMatrix = rendererMatrix.inverse()

    const { x, y } = controllerMatrix.transformPoint(new DOMPoint(viewportPoint.x, viewportPoint.y))
    const rawInputPoint: InputPoint = {
        x,
        y,
        pressure: viewportPoint.pressure,
        tags: viewportPoint.tags
    }

    const current = model.getCurrentStroke()
    if (!current) {
        throw new Error("addStrokePoint: current stroke missing")
    }

    const pendingPoints = current.waitCalcPoints

    if (current.points.length === 0) {
        if (pendingPoints.length < 2) {
            // stroke1点目、2点目の時はバッファに追加して終わり
            current.waitCalcPoints.push(rawInputPoint)
            return
        } else if (pendingPoints.length === 2) {
            // 3点目の場合は、0, 0, 1, currentでspline補間を行い、補間点を取得する
            const p0 = pendingPoints.shift()!
            const p1 = p0
            const p2 = pendingPoints[0]
            const p3 = rawInputPoint

            
            const dp = (p2.pressure - p1.pressure) / splinePoints
            const ps = spline.interpolate(p0, p1, p2, p3, 0.5, splinePoints)
            const points: InputPoint[] = ps.map((p, i) => {
                return {
                    x: p.x,
                    y: p.y,
                    pressure: p1.pressure + dp * i,
                    tags: ["spline"],
                }
            })
            
            current.waitRenderPoints.push(p1, ...points)
            current.waitCalcPoints.push(rawInputPoint)
            return
        }
    }

    const p0 = current.points[current.points.length - 1 - splinePoints]
    const p1 = pendingPoints.shift()!
    const p2 = pendingPoints[0]
    const p3 = rawInputPoint

    const dp = (p2.pressure - p1.pressure) / splinePoints
    const ps = spline.interpolate(p0, p1, p2, p3, 0.5, splinePoints)
    const points: InputPoint[] = ps.map((p, i) => {
        return {
            x: p.x,
            y: p.y,
            pressure: p1.pressure + dp * i,
            tags: ["spline"],
        }
    })

    current.waitRenderPoints.push(p1, ...points)
    current.waitCalcPoints.push(rawInputPoint)
}