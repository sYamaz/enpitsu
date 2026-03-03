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

    let penActiveCount = 0
    let lastPenActivityTime = 0
    const PALM_REJECTION_WINDOW_MS = 500

    const shouldRejectTouchEvent = (ev: PointerEvent): boolean => {
        if (ev.pointerType !== 'touch') return false
        if (penActiveCount > 0) return true
        return Date.now() - lastPenActivityTime < PALM_REJECTION_WINDOW_MS
    }

    toolCanvas.addEventListener('pointerdown', (ev) => {
        if (ev.pointerType === 'pen') {
            penActiveCount++
            lastPenActivityTime = Date.now()
        }
        if (shouldRejectTouchEvent(ev)) return
        toolLayer.onPointerDown(convertEvent(ev))
        combineLayer.requestRender()
    })

    toolCanvas.addEventListener('pointermove', ev => {
        if (ev.pointerType === 'pen') lastPenActivityTime = Date.now()
        if (shouldRejectTouchEvent(ev)) return
        toolLayer.onPointerMove(convertEvent(ev))
        combineLayer.requestRender()
    })

    toolCanvas.addEventListener('pointerup', ev => {
        if (ev.pointerType === 'pen') {
            penActiveCount = Math.max(0, penActiveCount - 1)
            lastPenActivityTime = Date.now()
        }
        if (shouldRejectTouchEvent(ev)) return
        toolLayer.onPointerUp(convertEvent(ev))
        combineLayer.requestRender()
    })

    toolCanvas.addEventListener('pointercancel', ev => {
        if (ev.pointerType === 'pen') {
            penActiveCount = Math.max(0, penActiveCount - 1)
            lastPenActivityTime = Date.now()
            toolLayer.onPointerUp(convertEvent(ev))
            combineLayer.requestRender()
        }
    })

    toolCanvas.addEventListener('wheel', (ev) => {
        ev.preventDefault()

        if (ev.ctrlKey) {
            // ピンチイン・アウト (iOS pinch / Ctrl+scroll)
            const scale = 1 - ev.deltaY * 0.003
            const newZoom = Math.max(0.1, transformer.zoomRatio * scale)
            const actualScale = newZoom / transformer.zoomRatio

            // ポインター位置を中心にズーム
            transformer.dx = ev.offsetX - (ev.offsetX - transformer.dx) * actualScale
            transformer.dy = ev.offsetY - (ev.offsetY - transformer.dy) * actualScale
            transformer.zoomRatio = newZoom
        } else {
            // パン (2本指スワイプ)
            transformer.dx -= ev.deltaX
            transformer.dy -= ev.deltaY
        }

        store.needClear = true
        combineLayer.requestRender()
    }, { passive: false })

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