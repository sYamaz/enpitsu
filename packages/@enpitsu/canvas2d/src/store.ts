import type { Stroke } from "./types";

export class SimpleStore {
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
            this.waitRenderStrokeHistory.push(this.currentStroke)
        }
        this.currentStroke = null
    }

    getWaitRenderStrokes(): Stroke[] {
        return this.waitRenderStrokeHistory
    }

    getConfirmedStrokes(): Stroke[] {
        return this.strokeHistory
    }
    updateConfirmedStrokes(strokes: Stroke[]): void {
        this.strokeHistory = strokes
    }
}