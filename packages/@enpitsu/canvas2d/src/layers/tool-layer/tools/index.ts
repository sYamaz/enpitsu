export { BasicTool } from './_basic'
export { PenTool } from './pen'
export { RemoverTool } from './remover'
export { EraserTool } from './eraser'
export { SelectorTool } from './selector'

import { StrokeStore } from 'store/stroke-store'
import { ViewportTransformer } from 'transformer/viewport-transformer'
import { Pen, Tool } from 'types'
import { EraserTool } from './eraser'
import { PenTool } from './pen'
import { RemoverTool } from './remover'
import { SelectorTool } from './selector'

export type ToolPlugin = (transformer: ViewportTransformer, store: StrokeStore) => Tool

export const penTool = (options?: { pen?: Pen }): ToolPlugin =>
    (transformer, store) => new PenTool(transformer, store, options?.pen)

export const eraserTool = (options?: { size?: number }): ToolPlugin =>
    (transformer, store) => new EraserTool(transformer, store, options?.size)

export const removerTool = (options?: { size?: number }): ToolPlugin =>
    (transformer, store) => new RemoverTool(transformer, store, options?.size)

export const selectorTool = (): ToolPlugin =>
    (transformer, store) => new SelectorTool(transformer, store)
