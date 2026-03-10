import { describe, it, expect, beforeEach } from 'vitest'
import { StrokeStore } from 'store/stroke-store'
import type { Stroke } from 'types'

const pen = {
    r: 0, g: 0, b: 0,
    minThickness: 1, maxThickness: 2,
    minColorRatio: 0.5, maxColorRatio: 1,
}

function makeStroke(points: { x: number; y: number }[]): Stroke {
    return {
        pen,
        needRender: true,
        points: points.map(p => ({ ...p, pressure: 0.5, tags: [], timestamp: 0 })),
    }
}

describe('StrokeStore', () => {
    let store: StrokeStore

    beforeEach(() => {
        store = new StrokeStore()
    })

    it('pushStrokes() でストロークが追加される', () => {
        store.pushStrokes(makeStroke([{ x: 0, y: 0 }, { x: 10, y: 10 }]))
        expect(store.strokes).toHaveLength(1)
    })

    it('pushStrokes() で bbox が自動計算される', () => {
        store.pushStrokes(makeStroke([{ x: 5, y: 3 }, { x: 15, y: 20 }]))
        const bbox = store.strokes[0].bbox!
        expect(bbox.left).toBe(5)
        expect(bbox.right).toBe(15)
        expect(bbox.top).toBe(3)
        expect(bbox.bottom).toBe(20)
    })

    it('undo() でストロークが削除される', () => {
        store.pushStrokes(makeStroke([{ x: 0, y: 0 }]))
        expect(store.canUndo).toBe(true)
        store.undo()
        expect(store.strokes).toHaveLength(0)
    })

    it('undo() 後は canUndo が false になる', () => {
        store.pushStrokes(makeStroke([{ x: 0, y: 0 }]))
        store.undo()
        expect(store.canUndo).toBe(false)
    })

    it('redo() でストロークが復元される', () => {
        store.pushStrokes(makeStroke([{ x: 0, y: 0 }]))
        store.undo()
        expect(store.canRedo).toBe(true)
        store.redo()
        expect(store.strokes).toHaveLength(1)
    })

    it('redo() 後は canRedo が false になる', () => {
        store.pushStrokes(makeStroke([{ x: 0, y: 0 }]))
        store.undo()
        store.redo()
        expect(store.canRedo).toBe(false)
    })

    it('updateConfirmedStrokes() でストロークが置き換わり needClear が立つ', () => {
        store.pushStrokes(makeStroke([{ x: 0, y: 0 }]))
        store.needClear = false
        const newStroke = makeStroke([{ x: 100, y: 100 }, { x: 200, y: 200 }])
        store.updateConfirmedStrokes([newStroke])
        expect(store.strokes).toHaveLength(1)
        expect(store.strokes[0].bbox!.left).toBe(100)
        expect(store.needClear).toBe(true)
    })
})
