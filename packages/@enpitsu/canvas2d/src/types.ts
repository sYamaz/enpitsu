// Basic
export interface Point {
    x: number;
    y: number;
}

export interface Controller {
    startInput: (viewportPoint: InputPoint) => void
    endInput: (viewportPoint: InputPoint) => void,
    addInputPoint: (viewportPoint: InputPoint) => void
}

export interface Renderer {
    clear: () => void,
    renderAll: () => void,
    requestRenderAll: (rendered?: () => void) => void
    renderCurrentStroke: () => void
    requestRenderCurrentStroke: (rendered?: () => void) => void,
    render: () => void,
    requestRender: (rendered?: () => void) => void
}

export interface Selection {
    selectedStrokes: Stroke[]
    unselectedStrokes: Stroke[]
    selectedBBox: {
        left: number
        right: number
        top: number
        bottom: number
        offsetX: number
        offsetY: number
    }
}

export interface ToolConfigureStructure {
    'pen': {
        pen: Pen
    },
    'remover': {
        size: number
    },
    'eraser': {
        size: number
    },
    'selector': {

    }
}

/**
 * リプレイ機能のコントローラー。
 *
 * `Enpitsu.startReplay()` で取得する。リプレイモード中は通常の描画入力が無効化され、
 * `StrokeStore` に蓄積されたストローク履歴を時系列に沿って再生できる。
 *
 * 再生位置は 0–1 の ratio で管理する:
 *   - 0 = 最初のストロークの先頭点
 *   - 1 = 最後のストロークの末尾点
 *
 * 使い終わったら必ず `destroy()` を呼ぶこと。呼ばないとポインターイベントが
 * toolCanvas で永続的に無効化されたままになる。
 */
export interface ReplayController {
    /** 現在位置から再生を開始する。末尾 (progress === 1) の場合は先頭に巻き戻してから再生する。 */
    play(): void
    /** 現在位置で一時停止する。 */
    pause(): void
    /**
     * 任意の位置にシークする。再生中でも呼び出し可能。
     * @param ratio 0–1。範囲外は clamp される。
     */
    seek(ratio: number): void
    /** 現在の再生位置 (0–1)。UI 側が参照するたびに最新値を返す getter。 */
    readonly progress: number
    readonly isPlaying: boolean
    /**
     * リプレイを終了し、通常描画モードに戻す。
     * - rAF ループを停止する
     * - `combinedLayer.setNormalMode()` を呼んで StoreStore の全ストロークを再描画する
     * - toolCanvas の pointerEvents を復元する
     */
    destroy(): void
}

export interface Enpitsu {
    useTool(type: string): void
    undo(): void
    redo(): void
    /**
     * リプレイモードを開始し、`ReplayController` を返す。
     *
     * 呼び出し時に進行中のストロークをキャンセルし、toolCanvas への
     * ポインターイベントを無効化する。戻り値の `destroy()` を呼ぶまで
     * ユーザーは描画できない。
     */
    startReplay(): ReplayController
    destroy(): void
}

//--------------------
// 以下、Modelに保存される情報
//--------------------

/**
 * ユーザーの入力点
 */
export interface InputPoint extends Point {
    pressure: number;
    tags: string[]
    timestamp: number
}

/**
 * ユーザーの入力したストローク
 * 
 * 補間実行後
 */
export interface Stroke {
    pen: Pen
    points: InputPoint[]
    needRender: boolean
    offset?: Point
    bbox?: {
        left: number
        top: number
        right: number
        bottom: number
    }
}

export interface CurrentStroke extends Stroke {
    waitCalcPoints: InputPoint[]
}

//--------------------
// 以下、描画時にModelの情報から変換した情報
//--------------------

export interface Joint extends Point {
    size: number;
    alpha: number;
    darkness: number;
}

export interface Segment {
    start: Joint
    end: Joint
    normX: number
    normY: number
    start1: Point
    end1: Point
    start2: Point
    end2: Point
}

//--------------------
// 以下、Store
//--------------------

export interface Pen {
    minThickness: number
    maxThickness: number

    minColorRatio: number
    maxColorRatio: number

    r: number
    g: number
    b: number
    alpha?: number  // 0-1, default 1
}

export type ToolRenderState =
    | { tool: 'idle' }
    | { tool: 'pen'; points: InputPoint[]; pen: Pen }
    | { tool: 'eraser' | 'remover'; cursor: InputPoint | null; size: number }
    | { tool: 'selector_drawing'; points: InputPoint[]; pen: Pen }
    | { tool: 'selector_selected'; bbox: { left: number; right: number; top: number; bottom: number } }

export interface Tool extends ToolRenderer, ToolController {

}

export interface ToolRenderer {
    getRenderState: () => ToolRenderState
}

export interface ToolController {
    onPointerDown: (viewportPoint: InputPoint) => void
    onPointerMove: (viewportPoint: InputPoint) => void
    onPointerUp: (viewportPoint: InputPoint) => void
    cancel: () => void
}