import type { Stroke } from "../types";

export class StrokeStore {
    private _strokeHistory: Stroke[] = []
    private _needClear = false

    get needClear() {
        return this._needClear
    }

    set needClear(value: boolean) {
        this._needClear = value
    }

    forEachStroke = (callback: (stroke: Stroke) => Stroke) => {
        this._strokeHistory = this._strokeHistory.map(callback)
    }

    get strokes() {
        return [...this._strokeHistory]
    }

    pushStrokes(...strokes: Stroke[]) {
        const mods: Stroke[] = strokes.map(stroke => {
            // Update the bbox for each stroke
            const left = Math.min(...stroke.points.map(p => p.x))
            const right = Math.max(...stroke.points.map(p => p.x))
            const top = Math.min(...stroke.points.map(p => p.y))
            const bottom = Math.max(...stroke.points.map(p => p.y))
            return {
                ...stroke,
                bbox: { left, right, top, bottom },
                needRender: true
            }
        })
        this._strokeHistory.push(...mods)
    }

    /**
     * ストロークを置き換える。
     * 主に、ストロークの内容を変更した際に呼び出す。
     * 
     * bboxの再計算、needRenderのtrue化を行う。
     * @param strokes 
     */
    updateConfirmedStrokes(strokes: Stroke[]): void {
        const mods: Stroke[] = strokes.map(stroke => {
            // Update the bbox for each stroke
            const left = Math.min(...stroke.points.map(p => p.x))
            const right = Math.max(...stroke.points.map(p => p.x))
            const top = Math.min(...stroke.points.map(p => p.y))
            const bottom = Math.max(...stroke.points.map(p => p.y))
            return {
                ...stroke,
                bbox: { left, right, top, bottom },
                needRender: true
            }
        })
        this._strokeHistory = [...mods]
        this._needClear = true
    }
}