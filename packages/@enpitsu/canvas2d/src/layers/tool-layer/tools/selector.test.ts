import { describe, it, expect } from 'vitest'
import { SelectorTool } from 'layers/tool-layer/tools/selector'
import { ViewportTransformer } from 'transformer/viewport-transformer'
import { StrokeStore } from 'store/stroke-store'

const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
]

function makeTool() {
    return new SelectorTool(new ViewportTransformer(), new StrokeStore())
}

describe('SelectorTool.isPointInPolygon()', () => {
    it('矩形内の点 → true', () => {
        const tool = makeTool()
        expect(tool.isPointInPolygon({ x: 5, y: 5 }, square)).toBe(true)
    })

    it('矩形外の点 → false', () => {
        const tool = makeTool()
        expect(tool.isPointInPolygon({ x: 20, y: 20 }, square)).toBe(false)
    })
})

describe('SelectorTool.segmentsIntersect()', () => {
    it('交差する線分 → true', () => {
        const tool = makeTool()
        // 対角線同士が交差
        expect(tool.segmentsIntersect(
            { x: 0, y: 0 }, { x: 10, y: 10 },
            { x: 10, y: 0 }, { x: 0, y: 10 },
        )).toBe(true)
    })

    it('平行線分 → false', () => {
        const tool = makeTool()
        expect(tool.segmentsIntersect(
            { x: 0, y: 0 }, { x: 10, y: 0 },
            { x: 0, y: 5 }, { x: 10, y: 5 },
        )).toBe(false)
    })

    it('T字型（端点が他方の中点）→ true', () => {
        const tool = makeTool()
        expect(tool.segmentsIntersect(
            { x: 5, y: 0 }, { x: 5, y: 10 },
            { x: 0, y: 5 }, { x: 10, y: 5 },
        )).toBe(true)
    })
})
