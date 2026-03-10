import { describe, it, expect } from 'vitest'
import { ViewportTransformer } from 'transformer/viewport-transformer'

describe('ViewportTransformer', () => {
    it('デフォルト zoom=1 で getTransformForController() が [1,0,0,1,0,0]', () => {
        const vt = new ViewportTransformer()
        expect(vt.getTransformForController()).toEqual([1, 0, 0, 1, 0, 0])
    })

    it('DPR=2 で getTransformForRender() が [2,0,0,2,0,0]', () => {
        const vt = new ViewportTransformer(1, 2)
        expect(vt.getTransformForRender()).toEqual([2, 0, 0, 2, 0, 0])
    })

    it('zoom 変更後の行列値が正しい', () => {
        const vt = new ViewportTransformer()
        vt.zoomRatio = 2
        const [a, , , d] = vt.getTransformForController()
        expect(a).toBe(2)
        expect(d).toBe(2)
    })

    it('resetZoomRatio() で初期値に戻る', () => {
        const vt = new ViewportTransformer(1.5)
        vt.zoomRatio = 3
        vt.resetZoomRatio()
        expect(vt.zoomRatio).toBe(1.5)
    })

    it('dx/dy が行列の e/f 成分に反映される', () => {
        const vt = new ViewportTransformer()
        vt.dx = 10
        vt.dy = 20
        const [, , , , e, f] = vt.getTransformForController()
        expect(e).toBe(10)
        expect(f).toBe(20)
    })
})
