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

export interface Enpitsu {
    useTool<k extends keyof ToolConfigureStructure>(type: k): void
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
    waitRenderPoints: InputPoint[]
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
}

export interface Tool extends ToolRenderer, ToolController {

}

export interface ToolRenderer {
    render: (ctx: OffscreenCanvasRenderingContext2D) => void
}

export interface ToolController {
    onPointerDown: (viewportPoint: InputPoint) => void
    onPointerMove: (viewportPoint: InputPoint) => void
    onPointerUp: (viewportPoint: InputPoint) => void
}