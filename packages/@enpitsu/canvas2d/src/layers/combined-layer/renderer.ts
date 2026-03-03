import { StrokeStore } from '../../store'
import { ViewportTransformer } from '../../transformer'
import type { CombinedWorkerOutMessage, StrokeSnapshot } from '../../workers/combined-layer.worker.types'
import CombinedLayerWorker from '../../workers/combined-layer.worker?worker&inline'

export const useCombinedLayerRenderer = (
    canvas: HTMLCanvasElement,
    transformer: ViewportTransformer,
    store: StrokeStore
) => {
    const offscreen = canvas.transferControlToOffscreen()
    const worker = new CombinedLayerWorker()
    worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen])

    let pendingRender = false
    let hasPendingRequest = false

    worker.onmessage = (e: MessageEvent<CombinedWorkerOutMessage>) => {
        if (e.data.type === 'render_done') {
            pendingRender = false
            if (hasPendingRequest) {
                hasPendingRequest = false
                _doRender()
            }
        }
    }

    const _doRender = () => {
        if (pendingRender) {
            hasPendingRequest = true
            return
        }
        pendingRender = true

        const needClear = store.needClear
        const strokes: StrokeSnapshot[] = store.strokes.map(s => ({
            pen: s.pen,
            points: s.points,
            offset: s.offset,
            needRender: s.needRender
        }))
        const [a, b, c, d, e, f] = transformer.getTransformForRender()

        // フラグリセット（postMessage 前に実行）
        store.needClear = false
        store.forEachStroke(s => ({ ...s, needRender: false }))

        worker.postMessage({ type: 'render', needClear, strokes, transform: { a, b, c, d, e, f } })
    }

    return {
        requestRender: _doRender,
        destroy: () => worker.terminate()
    }
}
