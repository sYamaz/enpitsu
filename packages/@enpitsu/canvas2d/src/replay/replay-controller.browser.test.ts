import { describe, it, expect, vi } from 'vitest'
import { createReplayController } from './replay-controller'
import type { StrokeStore } from '../store'
import type { Stroke } from '../types'

const makeStore = (strokes: Stroke[] = []): StrokeStore =>
    ({ strokes } as unknown as StrokeStore)

const makeRenderer = () => ({
    renderReplay: vi.fn(),
    setNormalMode: vi.fn(),
})

const makeStroke = (timestamps: number[]): Stroke => ({
    pen: { r: 0, g: 0, b: 0, minThickness: 1, maxThickness: 2, minColorRatio: 0.5, maxColorRatio: 1 },
    needRender: true,
    points: timestamps.map((t, i) => ({ x: i * 10, y: 0, pressure: 0.5, tags: [], timestamp: t })),
})

describe('createReplayController', () => {
    describe('ストロークが空の場合', () => {
        it('progress は 0 を返す', () => {
            const controller = createReplayController(makeStore(), makeRenderer())
            expect(controller.progress).toBe(0)
        })

        it('isPlaying は false を返す', () => {
            const controller = createReplayController(makeStore(), makeRenderer())
            expect(controller.isPlaying).toBe(false)
        })

        it('play() を呼んでも isPlaying は false のまま', () => {
            const controller = createReplayController(makeStore(), makeRenderer())
            controller.play()
            expect(controller.isPlaying).toBe(false)
        })

        it('destroy() で setNormalMode() が呼ばれる', () => {
            const renderer = makeRenderer()
            const controller = createReplayController(makeStore(), renderer)
            controller.destroy()
            expect(renderer.setNormalMode).toHaveBeenCalledOnce()
        })
    })

    describe('ストロークがある場合', () => {
        it('初期化時に ratio=0 の初期フレームが描画される', () => {
            const renderer = makeRenderer()
            createReplayController(makeStore([makeStroke([0, 100, 200])]), renderer)
            expect(renderer.renderReplay).toHaveBeenCalledOnce()
        })

        it('seek() で progress が変化する', () => {
            const controller = createReplayController(makeStore([makeStroke([0, 100, 200])]), makeRenderer())
            controller.seek(0.5)
            expect(controller.progress).toBe(0.5)
        })

        it('seek() の引数は 0–1 にクランプされる', () => {
            const controller = createReplayController(makeStore([makeStroke([0, 100])]), makeRenderer())
            controller.seek(-0.5)
            expect(controller.progress).toBe(0)
            controller.seek(1.5)
            expect(controller.progress).toBe(1)
        })

        it('seek() で時刻より前の点だけが renderReplay に渡される', () => {
            const renderer = makeRenderer()
            const controller = createReplayController(
                makeStore([makeStroke([0, 100, 200])]),
                renderer
            )
            renderer.renderReplay.mockClear()
            // timestamps=[0,100,200] → startTs=0, endTs=200, duration=200
            // ratio=0.5 → T = 0 + 0.5*200 = 100 → t<=100 の点: [0, 100] = 2点
            controller.seek(0.5)
            expect(renderer.renderReplay).toHaveBeenCalledOnce()
            const [strokes] = renderer.renderReplay.mock.calls[0]
            expect(strokes[0].points).toHaveLength(2)
        })

        it('play() で isPlaying が true になる', () => {
            // duration が長いストロークで play 中にテストが終わらないようにする
            const controller = createReplayController(makeStore([makeStroke([0, 100_000])]), makeRenderer())
            controller.play()
            expect(controller.isPlaying).toBe(true)
            controller.pause()
        })

        it('pause() で isPlaying が false になる', () => {
            const controller = createReplayController(makeStore([makeStroke([0, 100_000])]), makeRenderer())
            controller.play()
            controller.pause()
            expect(controller.isPlaying).toBe(false)
        })

        it('progress が 1 の状態で play() を呼ぶと先頭 (progress=0) から再開する', () => {
            const controller = createReplayController(makeStore([makeStroke([0, 100_000])]), makeRenderer())
            controller.seek(1)
            controller.play()
            expect(controller.isPlaying).toBe(true)
            expect(controller.progress).toBe(0)
            controller.pause()
        })

        it('destroy() で setNormalMode() が呼ばれる', () => {
            const renderer = makeRenderer()
            const controller = createReplayController(makeStore([makeStroke([0, 100])]), renderer)
            controller.destroy()
            expect(renderer.setNormalMode).toHaveBeenCalledOnce()
        })
    })
})
