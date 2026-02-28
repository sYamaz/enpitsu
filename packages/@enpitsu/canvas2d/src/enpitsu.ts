import { useCombinedLayer, useToolLayer } from "./layers"
import { StrokeStore } from "./store"
import { ViewportTransformer } from "./transformer"
import { Enpitsu, InputPoint } from "./types"

export const useEnpitsu = (
    toolCanvas: HTMLCanvasElement,
    combinedCanvas: HTMLCanvasElement
): Enpitsu => {
    const dpr = window.devicePixelRatio ?? 1
    const transformer = new ViewportTransformer(1, dpr)
    const store = new StrokeStore()

    const toolLayer = useToolLayer(toolCanvas, transformer, store)
    const combineLayer = useCombinedLayer(combinedCanvas, transformer, store)
    
    const convertEvent = (ev: PointerEvent): InputPoint => {
        return {
            pressure: ev.pressure,
            tags: [ev.pointerType],
            x: ev.offsetX,
            y: ev.offsetY
        }
    }

    toolCanvas.addEventListener('pointerdown', (ev) => {
        toolLayer.onPointerDown(convertEvent(ev))
        combineLayer.requestRender()
    })

    toolCanvas.addEventListener('pointermove', ev => {
        toolLayer.onPointerMove(convertEvent(ev))
        combineLayer.requestRender()
    })

    toolCanvas.addEventListener('pointerup', ev => {
        toolLayer.onPointerUp(convertEvent(ev))
        combineLayer.requestRender()
    })

    return {
        useTool: toolLayer.useTool,
        // panZoom(dx:number, dy:number, dz:number) {
        //     transformer.zoomRatio += dz
        //     transformer.dx += dx
        //     transformer.dy += dy

        //     combineLayer.requestRender()
        // }
    }
}