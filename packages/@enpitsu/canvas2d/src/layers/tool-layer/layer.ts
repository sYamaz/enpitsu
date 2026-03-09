import { useToolLayerRenderer } from './renderer'
import { EraserTool, PenTool, RemoverTool, SelectorTool } from './tools'
import { StrokeStore } from '../../store'
import { ViewportTransformer } from '../../transformer'
import { InputPoint, Tool, ToolConfigureStructure } from 'types'

export const useToolLayer = (
    canvas: HTMLCanvasElement,
    transformer: ViewportTransformer,
    store: StrokeStore
) => {
    const renderer = useToolLayerRenderer(canvas, transformer)

    const toolMap = new Map<keyof ToolConfigureStructure, Tool>()
    toolMap.set('pen', new PenTool(transformer, store))
    toolMap.set('remover', new RemoverTool(transformer, store))
    toolMap.set('eraser', new EraserTool(transformer, store))
    toolMap.set('selector', new SelectorTool(transformer, store))

    let tool = toolMap.get('pen')!
    let lastMoveTimestamp: number | null = null

    renderer.setTool(tool)

    return {
        useTool: function<k extends keyof ToolConfigureStructure>(type: k) {
            tool = toolMap.get(type)!
            renderer.setTool(tool)
            renderer.clear()
        },
        onPointerDown: (p: InputPoint) => {
            tool?.onPointerDown(p)
            renderer.render()
        },
        onPointerMove: (p: InputPoint) => {
            if (p.timestamp !== 0 && p.timestamp === lastMoveTimestamp) return
            lastMoveTimestamp = p.timestamp
            tool?.onPointerMove(p)
            renderer.requestRender()
        },
        onPointerUp: (p: InputPoint) => {
            tool?.onPointerUp(p)
            renderer.clear()
        },
        cancelStroke: () => {
            tool?.cancel()
            renderer.clear()
        },
        destroy: renderer.destroy
    }
}
