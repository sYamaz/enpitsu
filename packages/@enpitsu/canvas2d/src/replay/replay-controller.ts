/**
 * @module replay-controller
 *
 * ## リプレイ機能の設計
 *
 * ### タイムライン
 * `StrokeStore` が保持するストローク群の全点の timestamp を走査し、
 * 最小値を `startTs`、最大値を `endTs` としてタイムラインの両端を決める。
 * 再生位置 ratio (0–1) は `T = startTs + ratio * (endTs - startTs)` に変換される。
 *
 * ### シーク
 * 時刻 T でのフレームを描画するには、各ストロークの点列を
 * `timestamp <= T` でフィルタリングし、点が残ったストロークだけを
 * `combinedLayer.renderReplay()` に渡す。
 * ワーカー側は通常描画と同じパスを通るため変更不要。
 *
 * ### 再生ループ
 * `play()` は `requestAnimationFrame` を使ったループを開始する。
 * 各フレームで `(performance.now() - _playbackStartWall)` から経過時間を求め、
 * ratio に換算して `_seek()` を呼ぶ。ratio が 1 を超えたら末尾で停止する。
 * `pause()` は rAF をキャンセルするだけで、`_progress` は保持する。
 * 再開時は `_playbackStartProgress` を現在の `_progress` に設定し直すことで
 * シーク後の任意位置から再生できる。
 *
 * ### メインスレッド側でフィルタリング
 * ワーカーへ送るストロークデータをメインスレッド側で加工する方針を採っている。
 * これによりワーカー側のコードを変更せずリプレイ機能を追加できる。
 *
 * ### 終了
 * `destroy()` は rAF を停止したあと `renderer.setNormalMode()` を呼ぶ。
 * `setNormalMode()` は `store.needClear = true` を立て通常の `_doRender` を
 * 実行することで、StrokeStore の全ストロークをキャンバスに再描画する。
 */

import type { ReplayController, Stroke } from '../types'
import type { StrokeStore } from '../store'

type CombinedLayerRenderer = {
    renderReplay: (strokes: Stroke[]) => void
    setNormalMode: () => void
}

export const createReplayController = (
    store: StrokeStore,
    renderer: CombinedLayerRenderer
): ReplayController => {
    const strokes = store.strokes
    if (strokes.length === 0) {
        return _makeEmptyController(renderer)
    }

    const allPoints = strokes.flatMap(s => s.points)
    const startTs = Math.min(...allPoints.map(p => p.timestamp))
    const endTs = Math.max(...allPoints.map(p => p.timestamp))
    const duration = endTs - startTs

    let _progress = 0
    let _isPlaying = false
    let _rafId = 0
    /** play() 開始時点の performance.now() */
    let _playbackStartWall = 0
    /** play() 開始時点の _progress。シーク後に再生を再開したとき正しい位置から始めるために保持する。 */
    let _playbackStartProgress = 0

    /**
     * ratio に対応する時刻 T を計算し、T 以前の点のみを持つストロークを
     * renderReplay() に渡してフレームを描画する。
     */
    const _seek = (ratio: number) => {
        _progress = Math.max(0, Math.min(1, ratio))
        const T = duration === 0 ? endTs : startTs + _progress * duration
        const filtered = strokes
            .map(s => ({ ...s, points: s.points.filter(p => p.timestamp <= T) }))
            .filter(s => s.points.length > 0)
        renderer.renderReplay(filtered)
    }

    /** rAF コールバック。経過実時間を ratio に換算して _seek() を呼ぶ。 */
    const _tick = (now: number) => {
        if (!_isPlaying) return
        const elapsed = now - _playbackStartWall
        const ratio = _playbackStartProgress + elapsed / (duration || 1)
        if (ratio >= 1) {
            _seek(1)
            _isPlaying = false
            return
        }
        _seek(ratio)
        _rafId = requestAnimationFrame(_tick)
    }

    const controller: ReplayController = {
        get progress() { return _progress },
        get isPlaying() { return _isPlaying },

        play() {
            if (_isPlaying) return
            if (_progress >= 1) _progress = 0
            _isPlaying = true
            _playbackStartWall = performance.now()
            _playbackStartProgress = _progress
            _rafId = requestAnimationFrame(_tick)
        },

        pause() {
            if (!_isPlaying) return
            _isPlaying = false
            cancelAnimationFrame(_rafId)
        },

        seek(ratio: number) {
            _seek(ratio)
        },

        destroy() {
            _isPlaying = false
            cancelAnimationFrame(_rafId)
            renderer.setNormalMode()
        }
    }

    // ratio=0 の初期フレームを描画（空のキャンバス状態）
    _seek(0)

    return controller
}

/** ストロークが存在しない場合に返す no-op なコントローラー。 */
const _makeEmptyController = (renderer: CombinedLayerRenderer): ReplayController => ({
    get progress() { return 0 },
    get isPlaying() { return false },
    play() {},
    pause() {},
    seek(_ratio: number) {},
    destroy() { renderer.setNormalMode() }
})
