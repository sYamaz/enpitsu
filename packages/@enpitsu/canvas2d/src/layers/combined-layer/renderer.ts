import { StrokeStore } from '../../store'
import { ViewportTransformer } from '../../transformer'
import type { Stroke } from '../../types'
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

    /**
     * リプレイ用の描画。`ReplayController._seek()` から呼ばれる。
     *
     * 通常の `_doRender` とは異なり、`StrokeStore` を参照せず、
     * 呼び出し元がフィルタリング済みのストロークを直接渡す。
     * 常に `needClear: true` でキャンバス全体を再描画する。
     *
     * `pendingRender` フラグを使った排他制御は行わない。
     * リプレイ中は `_doRender` が呼ばれないため競合しない。
     */
    const renderReplay = (strokes: Stroke[]) => {
        const snapshots: StrokeSnapshot[] = strokes.map(s => ({
            pen: s.pen,
            points: s.points,
            offset: s.offset,
            needRender: true
        }))
        const [a, b, c, d, e, f] = transformer.getTransformForRender()
        worker.postMessage({ type: 'render', needClear: true, strokes: snapshots, transform: { a, b, c, d, e, f } })
    }

    /**
     * リプレイ終了後に通常描画モードへ戻す。
     *
     * `store.needClear = true` を立てることで次の `_doRender` で
     * キャンバスをクリアして全ストロークを再描画させる。
     */
    const setNormalMode = () => {
        store.needClear = true
        _doRender()
    }

    return {
        requestRender: _doRender,
        renderReplay,
        setNormalMode,
        destroy: () => worker.terminate()
    }
}
