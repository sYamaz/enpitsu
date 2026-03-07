import { StrokeStore } from 'store/stroke-store'
import { BasicTool } from './_basic'
import { ViewportTransformer } from 'transformer/viewport-transformer'
import { InputPoint, Point, ToolRenderState } from 'types'

export class RemoverTool extends BasicTool {

    size: number = 20
    private cursor: InputPoint | null = null
    private readonly model: StrokeStore

    constructor(transformer: ViewportTransformer, model: StrokeStore) {
        super(transformer)
        this.model = model
    }

    getRenderState(): ToolRenderState {
        return { tool: 'remover', cursor: this.cursor, size: this.size }
    }

    protected _onCancel = (): void => {
        this.cursor = null
    }

    protected _onPointerDown = (rawPoint: InputPoint): void => {
        this.cursor = rawPoint
    }
    protected _onPointerMove = (rawPoint: InputPoint, isPointerDown: boolean): void => {
        if(!isPointerDown) {
            return
        }

        this.cursor = rawPoint

        const filtered = this.model.strokes.filter(stroke => {
            const bbox = stroke.bbox!
            // BBoxと交差してないなら残す（消さない）
            const intersectsBBox = !(
                bbox.right < rawPoint.x - this.size ||
                bbox.left > rawPoint.x + this.size ||
                bbox.bottom < rawPoint.y - this.size ||
                bbox.top > rawPoint.y + this.size
            );

            // 交差してなければ残す（消さない）
            if (!intersectsBBox) return true;

            const somePointsCrossed = stroke.points.some((p1, i) => {
                const j = i + 1
                const pj = stroke.points[j]
                if (!pj) {
                    return false
                }
                return segmentIntersectsCircle(p1, pj, rawPoint, this.size)
            })
            if (somePointsCrossed) {
                return false
            } else {
                return true
            }
        })
        this.model.updateConfirmedStrokes(filtered)
    }

    protected _onPointerUp = (rawPoint: InputPoint): void => {
        this.cursor = null
    }

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