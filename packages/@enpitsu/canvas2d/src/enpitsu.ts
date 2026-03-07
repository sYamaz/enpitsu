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

    // キャンバスの論理サイズ（transferControlToOffscreen 前に取得）
    const canvasW = toolCanvas.width / dpr
    const canvasH = toolCanvas.height / dpr

    const clampPan = () => {
        const z = transformer.zoomRatio
        transformer.dx = Math.max(canvasW * (1 - z), Math.min(0, transformer.dx))
        transformer.dy = Math.max(canvasH * (1 - z), Math.min(0, transformer.dy))
    }

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

    // 2本指ピンチ管理
    const activePointers = new Map<number, { x: number; y: number }>()
    let isPinching = false
    let lastPinchDist = 0
    let lastPinchMid = { x: 0, y: 0 }

    const getPinchInfo = () => {
        const [p1, p2] = [...activePointers.values()]
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
        return { dist, mid }
    }

    toolCanvas.addEventListener('pointerdown', (ev) => {
        if (ev.pointerType === 'pen') {
            penActiveCount++
            lastPenActivityTime = Date.now()
        }
        if (ev.pointerType === 'touch') {
            activePointers.set(ev.pointerId, { x: ev.offsetX, y: ev.offsetY })
            if (activePointers.size === 2) {
                isPinching = true
                const { dist, mid } = getPinchInfo()
                lastPinchDist = dist
                lastPinchMid = mid
                // 進行中のストロークをキャンセル
                toolLayer.onPointerUp(convertEvent(ev))
                return
            }
        }
        if (shouldRejectTouchEvent(ev)) return
        toolLayer.onPointerDown(convertEvent(ev))
        combineLayer.requestRender()
    })

    toolCanvas.addEventListener('pointermove', ev => {
        if (ev.pointerType === 'pen') lastPenActivityTime = Date.now()
        if (ev.pointerType === 'touch' && activePointers.has(ev.pointerId)) {
            activePointers.set(ev.pointerId, { x: ev.offsetX, y: ev.offsetY })
            if (isPinching && activePointers.size === 2) {
                const { dist, mid } = getPinchInfo()
                const scale = dist / lastPinchDist
                const newZoom = Math.max(0.1, transformer.zoomRatio * scale)
                const actualScale = newZoom / transformer.zoomRatio
                // ピンチ中心でズーム + 中心点の移動でパン
                transformer.dx = lastPinchMid.x - (lastPinchMid.x - transformer.dx) * actualScale + (mid.x - lastPinchMid.x)
                transformer.dy = lastPinchMid.y - (lastPinchMid.y - transformer.dy) * actualScale + (mid.y - lastPinchMid.y)
                transformer.zoomRatio = newZoom
                lastPinchDist = dist
                lastPinchMid = mid
                clampPan()
                store.needClear = true
                combineLayer.requestRender()
                return
            }
        }
        if (shouldRejectTouchEvent(ev)) return
        if (isPinching) return
        toolLayer.onPointerMove(convertEvent(ev))
        combineLayer.requestRender()
    })

    toolCanvas.addEventListener('pointerup', ev => {
        if (ev.pointerType === 'pen') {
            penActiveCount = Math.max(0, penActiveCount - 1)
            lastPenActivityTime = Date.now()
        }
        if (ev.pointerType === 'touch') {
            activePointers.delete(ev.pointerId)
            if (activePointers.size < 2) isPinching = false
        }
        if (shouldRejectTouchEvent(ev)) return
        if (isPinching) return
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
        if (ev.pointerType === 'touch') {
            activePointers.delete(ev.pointerId)
            if (activePointers.size < 2) isPinching = false
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

        clampPan()
        store.needClear = true
        combineLayer.requestRender()
    }, { passive: false })

    return {
        useTool: toolLayer.useTool,
        undo: () => { store.undo(); combineLayer.requestRender() },
        redo: () => { store.redo(); combineLayer.requestRender() },
        destroy: () => { toolLayer.destroy(); combineLayer.destroy() }
    }
}