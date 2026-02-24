import { StrokeStore } from "store/stroke-store";
import { ViewportTransformer } from "transformer/viewport-transformer";
import { Controller, InputPoint, Point } from "types";

export interface RemoverConfig {
    size: number
    afterStartInput: () => void
    afterEndInput: () => void
    beforeAddInputPoint: () => void
    afterAddInputPoint: () => void
}

export const useRemover = (
    offscreenCanvas: OffscreenCanvas,
    transformer: ViewportTransformer,
    model: StrokeStore, 
    config: Partial<RemoverConfig>): Controller => {
    const ctx = offscreenCanvas.getContext('2d')!

    const determinedConfig: RemoverConfig = {
        size: config.size ?? 20,
        afterStartInput: config.afterStartInput ?? (() => { }),
        afterEndInput: config.afterEndInput ?? (() => { }),
        beforeAddInputPoint: config.beforeAddInputPoint ?? (() => { }),
        afterAddInputPoint: config.afterAddInputPoint ?? (() => { })
    }

    return {
        startInput: (viewportPoint: InputPoint) => {
            startInput(determinedConfig)
            determinedConfig.afterStartInput()
        },
        endInput: (viewportPoint: InputPoint) => {
            endInput(ctx, determinedConfig)
            determinedConfig.afterEndInput()
        },
        addInputPoint: (viewportPoint: InputPoint) => {
            determinedConfig.beforeAddInputPoint()
            addInputPoint(ctx, viewportPoint, model, transformer, determinedConfig)
            determinedConfig.afterAddInputPoint()
        } 
    }
}

const startInput = (config: RemoverConfig) => {
    // 何もしない
}

const endInput = (ctx: OffscreenCanvasRenderingContext2D, config: RemoverConfig) => {
    // 何もしない
}

const addInputPoint = (ctx: OffscreenCanvasRenderingContext2D, viewportInput: InputPoint, model: StrokeStore, transformer: ViewportTransformer, config: RemoverConfig) => {
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
    const filteredStrokes = strokes.filter(stroke => { // filterでfalseを返したら消されたとみなす
        const bbox = stroke.bbox!
        // BBoxと交差してないなら残す（消さない）
        const intersectsBBox = !(
            bbox.right < rawInputPoint.x - config.size ||
            bbox.left > rawInputPoint.x + config.size ||
            bbox.bottom < rawInputPoint.y - config.size ||
            bbox.top > rawInputPoint.y + config.size
        );

        // 交差してなければ残す（消さない）
        if (!intersectsBBox) return true;

        // 1点も交差してなければ残す
        return !stroke.points.some((pi, i) => {
            const j = i + 1
            const pj = stroke.points[j]
            if (!pj) {
                return false
            }
            return segmentIntersectsCircle(pi, pj, rawInputPoint, config.size)
        })
    })
    model.updateConfirmedStrokes(filteredStrokes)
}


// ストロークの各線分 vs 消しゴム円
function segmentIntersectsCircle(p1: Point, p2: Point, center: Point, radius: number) {
    // p1→p2のベクトル上で最近傍点を求める
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const t = Math.max(0, Math.min(1,
        ((center.x - p1.x) * dx + (center.y - p1.y) * dy) / (dx * dx + dy * dy)
    ));
    const nearest = { x: p1.x + t * dx, y: p1.y + t * dy };
    const dist = Math.hypot(center.x - nearest.x, center.y - nearest.y);
    return dist <= radius;
}