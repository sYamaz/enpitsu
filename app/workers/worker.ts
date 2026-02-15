import { type InputPoint, type Joint, type Point, type Segment, useHandWriter } from './hand-writer';
const FILL_COLOR = "black";
const LINE_STROKE_WIDTH = 0;

let offscreen: OffscreenCanvas | null = null;
let dpi = 1;
let prev: InputPoint | null = null;

const hr = useHandWriter(0, 10);

const getCtxFromOffscreen = (offscreen: OffscreenCanvas) => {
    const ctx = offscreen.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get 2D context from offscreen canvas');
    }
    return ctx;
}

const drawJoint = (ctx: OffscreenCanvasRenderingContext2D, joint: Joint) => {
    ctx.beginPath();
    ctx.arc(joint.x, joint.y, joint.size, 0, 2 * Math.PI);
    ctx.fillStyle = FILL_COLOR;
    ctx.fill();
}

const drawSegment = (ctx: OffscreenCanvasRenderingContext2D, seg: Segment) => {
    ctx.beginPath();
    ctx.moveTo(seg.start1.x, seg.start1.y);
    ctx.lineTo(seg.end1.x, seg.end1.y);
    ctx.lineTo(seg.end2.x, seg.end2.y);
    ctx.lineTo(seg.start2.x, seg.start2.y);
    ctx.closePath();
    ctx.fillStyle = FILL_COLOR;
    ctx.fill();
}

const handlers = {
    init: (data: {canvas: OffscreenCanvas, dpi: number}) => {
        offscreen = data.canvas;
        dpi = data.dpi;
        offscreen.width = offscreen.width * dpi;
        offscreen.height = offscreen.height * dpi;

        const ctx = getCtxFromOffscreen(offscreen);
        ctx.scale(dpi, dpi);
    },
    inkup(data: {point: InputPoint}) {
        const {point} = data;

        if(point.pressure === 0){
            point.pressure = 0.1; // pressureが0の場合は最低値を設定
        }

        const ctx = getCtxFromOffscreen(offscreen!);
        if(prev){
            const seg = hr.getSegment(prev, point);
            drawSegment(ctx, seg);
        }

        const joint = hr.convertToJoint(point);
        drawJoint(ctx, joint);

        prev = null;
    },
    inkdraw(data: {point: InputPoint}) {
        const {point} = data;
        if(point.pressure === 0){
            point.pressure = 0.1; // pressureが0の場合は最低値を設定
        }

        const ctx = getCtxFromOffscreen(offscreen!);
        if(prev){
            const seg = hr.getSegment(prev, point);
            drawSegment(ctx, seg);
        }

        const joint = hr.convertToJoint(point);
        drawJoint(ctx, joint);

        prev = point;

    },
    indown(data: {point: InputPoint}) {
        const current = data.point;
        if(current.pressure === 0){
            current.pressure = 0.1; // pressureが0の場合は最低値を設定
        }

        const joint = hr.convertToJoint(current);
        const ctx = getCtxFromOffscreen(offscreen!);
        
        drawJoint(ctx, joint);

        prev = current;
    }
}

self.onmessage = (ev) => {
    const {type, data} = ev.data;

    if (handlers[type as keyof typeof handlers]) {
        handlers[type as keyof typeof handlers](data);
    } else {
        console.warn(`Unknown message type: ${type}`);
    }
}

console.log('[Worker] Module loaded and ready');