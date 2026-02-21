// Basic
export interface Point {
    x: number;
    y: number;
}

export interface Controller {
    startInput: () => void
    endInput: () => void,
    addInputPoint: (viewportPoint: InputPoint) => void
}

export interface Renderer {
    clear: () => void,
    renderAll: () => void,
    requestRenderAll: (rendered?: () => void) => void
    renderCurrentStroke: () => void
    requestRenderCurrentStroke: (rendered?: () => void) => void,
    renderConfirmedStrokes: () => void,
    requestRenderConfirmedStrokes: (rendered?: () => void) => void
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
    waitCalcPoints: InputPoint[]
    waitRenderPoints: InputPoint[]
    points: InputPoint[]
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

interface ToolStructure {
    // ペン
    pen: Pen,
    // // 消しゴム
    // eraser: {
    //     thickness: number
    // }
}

export type ToolConfig = {
    [K in keyof ToolStructure]: {
        key: string
        type: K
        config: ToolStructure[K]
    }
}[keyof ToolStructure]

export interface ToolStore {
    setTool(tool: ToolConfig): void

    selectTool(key: string): boolean

    getSelectedTool(): Tool
}

export interface Tool {
    getToolConfig(): ToolConfig
    drawJoint(ctx: OffscreenCanvasRenderingContext2D, p: InputPoint): void
    drawSegment(ctx: OffscreenCanvasRenderingContext2D, pi: InputPoint, pj: InputPoint): void
}