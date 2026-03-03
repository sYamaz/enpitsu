import type { Stroke } from "../types";
import { AddStrokeCommand, UpdateStrokesCommand, type Command } from "./commands";

export class StrokeStore {
    private _strokeHistory: Stroke[] = []
    private _needClear = false
    private _undoStack: Command[] = []
    private _redoStack: Command[] = []

    get needClear() {
        return this._needClear
    }

    set needClear(value: boolean) {
        this._needClear = value
    }

    get canUndo() {
        return this._undoStack.length > 0
    }

    get canRedo() {
        return this._redoStack.length > 0
    }

    forEachStroke = (callback: (stroke: Stroke) => Stroke) => {
        this._strokeHistory = this._strokeHistory.map(callback)
    }

    get strokes() {
        return [...this._strokeHistory]
    }

    private _execute(cmd: Command) {
        cmd.execute()
        this._undoStack.push(cmd)
        this._redoStack.splice(0)
    }

    undo() {
        const cmd = this._undoStack.pop()
        if (!cmd) return
        cmd.undo()
        this._redoStack.push(cmd)
        this._needClear = true
    }

    redo() {
        const cmd = this._redoStack.pop()
        if (!cmd) return
        cmd.execute()
        this._undoStack.push(cmd)
        this._needClear = true
    }

    pushStrokes(...strokes: Stroke[]) {
        for (const stroke of strokes) {
            const cmd = new AddStrokeCommand(
                stroke,
                (s) => this._applyPush(s),
                () => this._applyPop()
            )
            this._execute(cmd)
        }
    }

    private _applyPush(stroke: Stroke) {
        const left = Math.min(...stroke.points.map(p => p.x))
        const right = Math.max(...stroke.points.map(p => p.x))
        const top = Math.min(...stroke.points.map(p => p.y))
        const bottom = Math.max(...stroke.points.map(p => p.y))
        this._strokeHistory.push({
            ...stroke,
            bbox: { left, right, top, bottom },
            needRender: true
        })
    }

    private _applyPop() {
        this._strokeHistory.pop()
    }

    /**
     * ストロークを置き換える。
     * 主に、ストロークの内容を変更した際に呼び出す。
     *
     * bboxの再計算、needRenderのtrue化を行う。
     * @param strokes
     */
    updateConfirmedStrokes(strokes: Stroke[]): void {
        const before = [...this._strokeHistory]
        const cmd = new UpdateStrokesCommand(
            before,
            strokes,
            (s) => this._applyUpdate(s)
        )
        this._execute(cmd)
        this._needClear = true
    }

    private _applyUpdate(strokes: Stroke[]) {
        const mods: Stroke[] = strokes.map(stroke => {
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
