import { useToolLayerRenderer } from "./renderer";
import { EraserTool, PenTool, RemoverTool, SelectorTool } from "./tools";
import { StrokeStore } from "../../store";
import { ViewportTransformer } from "../../transformer";
import { InputPoint, Pen, Tool, ToolConfigureStructure } from "types";

export const useToolLayer = (
    canvas: HTMLCanvasElement, 
    transformer: ViewportTransformer,
    store: StrokeStore
) => {
    const renderer = useToolLayerRenderer(canvas)

    const toolMap = new Map<keyof ToolConfigureStructure, Tool>()
    toolMap.set('pen', new PenTool(transformer, store))
    toolMap.set('remover', new RemoverTool(transformer, store))
    toolMap.set('eraser', new EraserTool(transformer, store))
    toolMap.set('selector', new SelectorTool(transformer, store))

    let tool = toolMap.get('pen')!
    let rendering = false

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
            if (!rendering) {
                rendering = true

                tool?.onPointerMove(p)
                renderer.requestRender(() => {
                    rendering = false
                })
            }
        },
        onPointerUp: (p: InputPoint) => {
            tool?.onPointerUp(p)
            renderer.clear()
            renderer.requestRender()
        }
    }
}