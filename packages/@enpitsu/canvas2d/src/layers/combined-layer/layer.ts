import { useCombinedLayerRenderer } from './renderer'
import { StrokeStore } from 'store'
import { ViewportTransformer } from '../../transformer'

export const useCombinedLayer = (
    canvas: HTMLCanvasElement,
    transformer: ViewportTransformer,
    store: StrokeStore
) => {
    const renderer = useCombinedLayerRenderer(canvas, transformer, store)
    return {
        ...renderer
    }
}
