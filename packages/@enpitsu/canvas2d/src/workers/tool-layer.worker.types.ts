import type { ToolRenderState } from '../types'

export type { ToolRenderState }

export interface TransformSnapshot {
    a: number; b: number; c: number; d: number; e: number; f: number
}

export type ToolWorkerInMessage =
    | { type: 'init'; canvas: OffscreenCanvas }
    | { type: 'render'; state: ToolRenderState; transform: TransformSnapshot }
    | { type: 'clear' }

export type ToolWorkerOutMessage = { type: 'render_done' }
