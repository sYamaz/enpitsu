import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useEnpitsu } from 'enpitsu'
import type { Enpitsu } from 'types'

const makeCanvases = () => {
    const toolCanvas = document.createElement('canvas')
    const combinedCanvas = document.createElement('canvas')
    toolCanvas.width = 800
    toolCanvas.height = 600
    combinedCanvas.width = 800
    combinedCanvas.height = 600
    document.body.appendChild(toolCanvas)
    document.body.appendChild(combinedCanvas)
    return { toolCanvas, combinedCanvas }
}

describe('useEnpitsu', () => {
    let toolCanvas: HTMLCanvasElement
    let combinedCanvas: HTMLCanvasElement
    let enpitsu: Enpitsu

    beforeEach(() => {
        const canvases = makeCanvases()
        toolCanvas = canvases.toolCanvas
        combinedCanvas = canvases.combinedCanvas
        enpitsu = useEnpitsu(toolCanvas, combinedCanvas)
    })

    afterEach(() => {
        enpitsu.destroy()
        toolCanvas.remove()
        combinedCanvas.remove()
    })

    it('初期化して API オブジェクトが返る', () => {
        expect(typeof enpitsu.useTool).toBe('function')
        expect(typeof enpitsu.undo).toBe('function')
        expect(typeof enpitsu.redo).toBe('function')
        expect(typeof enpitsu.startReplay).toBe('function')
        expect(typeof enpitsu.destroy).toBe('function')
    })

    it('useTool() で各ツールに切り替えられる', () => {
        expect(() => enpitsu.useTool('pen')).not.toThrow()
        expect(() => enpitsu.useTool('eraser')).not.toThrow()
        expect(() => enpitsu.useTool('remover')).not.toThrow()
        expect(() => enpitsu.useTool('selector')).not.toThrow()
    })

    it('存在しないツール名を指定しても例外が発生しない', () => {
        expect(() => enpitsu.useTool('nonexistent')).not.toThrow()
    })

    it('ストロークなしで undo() / redo() を呼んでもエラーが発生しない', () => {
        expect(() => enpitsu.undo()).not.toThrow()
        expect(() => enpitsu.redo()).not.toThrow()
    })

    it('startReplay() が ReplayController を返す', () => {
        const controller = enpitsu.startReplay()
        expect(typeof controller.play).toBe('function')
        expect(typeof controller.pause).toBe('function')
        expect(typeof controller.seek).toBe('function')
        expect(typeof controller.destroy).toBe('function')
        expect(controller.progress).toBe(0)
        expect(controller.isPlaying).toBe(false)
        controller.destroy()
    })

    it('startReplay() 中は toolCanvas の pointerEvents が none になる', () => {
        const controller = enpitsu.startReplay()
        expect(toolCanvas.style.pointerEvents).toBe('none')
        controller.destroy()
    })

    it('destroy() を呼ぶと toolCanvas の pointerEvents が復元される', () => {
        const controller = enpitsu.startReplay()
        controller.destroy()
        expect(toolCanvas.style.pointerEvents).toBe('')
    })
})
