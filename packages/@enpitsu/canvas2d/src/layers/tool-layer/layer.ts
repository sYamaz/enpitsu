import { useToolLayerRenderer } from './renderer'
import { ToolPlugin } from './tools'
import { StrokeStore } from '../../store'
import { ViewportTransformer } from '../../transformer'
import { InputPoint, Tool } from 'types'

export const useToolLayer = (
    canvas: HTMLCanvasElement,
    transformer: ViewportTransformer,
    store: StrokeStore,
    toolPlugins: Map<string, ToolPlugin>
) => {
    const renderer = useToolLayerRenderer(canvas, transformer)

    const toolMap = new Map<string, Tool>()
    for (const [name, factory] of toolPlugins) {
        toolMap.set(name, factory(transformer, store))
    }

    let tool = toolMap.values().next().value as Tool | undefined
    let lastMoveTimestamp: number | null = null

    if (tool) renderer.setTool(tool)

    return {
        useTool: function(type: string) {
            const next = toolMap.get(type)
            if (!next) return
            tool = next
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
