import { ViewportTransformer } from 'transformer/viewport-transformer'
import { InputPoint, Tool, ToolRenderState } from 'types'

export abstract class BasicTool implements Tool {
    private readonly transformer: ViewportTransformer
    private isDown = false

    constructor(transformer: ViewportTransformer) {
        this.transformer = transformer
    }

    abstract getRenderState(): ToolRenderState

    private convertViewportPointToRawPoint = (viewportPoint: InputPoint): InputPoint => {
        const rendererMatrix = new DOMMatrix(this.transformer.getTransformForController())
        const controllerMatrix = rendererMatrix.inverse()

        const { x, y } = controllerMatrix.transformPoint(new DOMPoint(viewportPoint.x, viewportPoint.y))
        const rawInputPoint: InputPoint = {
            x,
            y,
            pressure: viewportPoint.pressure,
            tags: viewportPoint.tags
        }
        return rawInputPoint
    }

    onPointerDown = (viewportPoint: InputPoint): void => {
        this.isDown = true
        const rawInputPoint = this.convertViewportPointToRawPoint(viewportPoint)
        this._onPointerDown(rawInputPoint)
    }

    protected abstract _onPointerDown(rawPoint: InputPoint): void

    onPointerMove = (viewportPoint: InputPoint): void => {
        const rawInputPoint = this.convertViewportPointToRawPoint(viewportPoint)
        this._onPointerMove(rawInputPoint, this.isDown)
    }

    protected abstract _onPointerMove(rawPoint: InputPoint, isPointerDown: boolean): void

    onPointerUp = (viewportPoint: InputPoint): void => {
        const rawInputPoint = this.convertViewportPointToRawPoint(viewportPoint)
        this._onPointerUp(rawInputPoint)
        this.isDown = false
    }

    protected abstract _onPointerUp(rawPoint: InputPoint): void

    cancel = (): void => {
        this.isDown = false
        this._cancel()
    }

    protected abstract _cancel(): void
}
