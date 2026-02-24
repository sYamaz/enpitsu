import type { Stroke } from "../types";

export class StrokeStore {
    private currentStroke: Stroke | null = null
    private waitRenderStrokeHistory: Stroke[] = []
    private strokeHistory: Stroke[] = []

    getCurrentStroke(): Stroke | null {
        return this.currentStroke
    }
    updateCurrentStroke(stroke: Stroke): void {
        this.currentStroke = stroke
    }
    confirmCurrentStroke(): void {
        if (this.currentStroke) {
            this.currentStroke.waitCalcPoints.splice(0)
            this.currentStroke.waitCalcPoints.splice(0)

            // BBoxの計算をする
            const left = Math.min(...this.currentStroke.points.map(p => p.x))
            const right = Math.max(...this.currentStroke.points.map(p => p.x))
            const top = Math.min(...this.currentStroke.points.map(p => p.y))
            const bottom = Math.max(...this.currentStroke.points.map(p => p.y))
            this.currentStroke.bbox = { left, right, top, bottom }

            this.waitRenderStrokeHistory.push(this.currentStroke)
            this.strokeHistory.push(this.currentStroke)
        }
        this.currentStroke = null
    }

    getWaitRenderStrokes(): Stroke[] {
        return this.waitRenderStrokeHistory
    }

    clearWaitRenderStrokes(): void {
        this.waitRenderStrokeHistory.splice(0)
    }

    getConfirmedStrokes(): Stroke[] {
        return this.strokeHistory
    }
    updateConfirmedStrokes(strokes: Stroke[]): void {
        this.strokeHistory = strokes
    }
}