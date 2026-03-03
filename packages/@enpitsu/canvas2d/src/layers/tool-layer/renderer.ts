import { Tool } from 'types'
import { ViewportTransformer } from '../../transformer'
import type { ToolWorkerOutMessage } from '../../workers/tool-layer.worker.types'
import ToolLayerWorker from '../../workers/tool-layer.worker?worker&inline'

export const useToolLayerRenderer = (
    canvas: HTMLCanvasElement,
    transformer: ViewportTransformer
) => {
    const offscreen = canvas.transferControlToOffscreen()
    const worker = new ToolLayerWorker()
    worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen])

    let tool: Tool | null = null
    let pendingRender = false
    let hasPendingRequest = false

    worker.onmessage = (e: MessageEvent<ToolWorkerOutMessage>) => {
        if (e.data.type === 'render_done') {
            pendingRender = false
            if (hasPendingRequest) {
                hasPendingRequest = false
                _doRender()
            }
        }
    }

    const _doRender = () => {
        if (!tool) return
        if (pendingRender) {
            hasPendingRequest = true
            return
        }
        pendingRender = true

        const state = tool.getRenderState()
        const [a, b, c, d, e, f] = transformer.getTransformForRender()
        worker.postMessage({ type: 'render', state, transform: { a, b, c, d, e, f } })
    }

    return {
        clear: () => {
            worker.postMessage({ type: 'clear' })
        },
        setTool: (_tool: Tool) => {
            tool = _tool
        },
        render: () => {
            _doRender()
        },
        requestRender: () => {
            _doRender()
        },
        destroy: () => worker.terminate()
    }
}
