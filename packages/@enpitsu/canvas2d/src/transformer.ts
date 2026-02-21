export class ViewportTransformer {

    /**
     * 拡大率
     * 
     */
    private zoomRatio = 1

    /**
     * x方向の移動
     */
    dx = 0

    /**
     * y方向の移動
     */
    dy = 0

    private readonly zoomStep: number

    private readonly defaultZoom: number

    private readonly dpr: number

    constructor(zoomStep = 0.1, defaultZoom = 1, dpr = 1) {
        this.zoomStep = zoomStep
        this.defaultZoom = defaultZoom
        this.zoomRatio = this.defaultZoom
        this.dpr = dpr
    }

    incrementZoomRatio = () => {
        this.zoomRatio += this.zoomStep
    }

    decrementZoomRatio = () => {
        this.zoomRatio -= this.zoomStep
    }

    resetZoomRatio = () => {
        this.zoomRatio = this.defaultZoom
    }

    /**
     * raw座標をviewport座標に変換するためのmatrix。
     * 逆行列はDOMMatrix.inverse()を使うと良い
     * @returns 
     */
    getTransformForRender = (): [a:number, b:number, c:number, d:number, e:number, f:number] => {
        return [this.zoomRatio * this.dpr, 0, 0, this.zoomRatio * this.dpr, this.dx * this.dpr, this.dy * this.dpr]
    }

    // DPRなし版 → controller側の座標変換専用
    getTransformForController = (): [a:number, b:number, c:number, d:number, e:number, f:number] => {
        // return [this.zoomRatio, 0, 0, this.zoomRatio, this.dx, this.dy]
        return [this.zoomRatio, 0, 0, this.zoomRatio, this.dx, this.dy]
    }
}