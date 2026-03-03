import type { Pen, InputPoint, Point } from '../types'

export interface StrokeSnapshot {
    pen: Pen
    points: InputPoint[]
    offset?: Point
    needRender: boolean
}

export interface TransformSnapshot {
    a: number; b: number; c: number; d: number; e: number; f: number
}

export type CombinedWorkerInMessage =
    | { type: 'init'; canvas: OffscreenCanvas }
    | { type: 'render'; needClear: boolean; strokes: StrokeSnapshot[]; transform: TransformSnapshot }

export type CombinedWorkerOutMessage =
    | { type: 'render_done' }
