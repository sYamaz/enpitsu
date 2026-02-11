<template>
    <UContainer style="touch-action: none;">
        <pointerCanvas ref="canvasRef" :dpi="DPI" style="background-color: white;" :canvasId="CANVAS_ID" @onPointerDown="handlePointerDown" @onPointerUp="handlePointerUp"
             @onPointerDraw="handlePointerDraw" />
        <p style="user-select: none;pointer-events: none;">{{ log }}</p>
    </UContainer>
</template>

<script setup lang="ts">
import {type InputPoint} from '~/utils/hand-writer'
import pointerCanvas from '~/components/atom/pointer-canvas.vue';
const FILL_COLOR = "black";
const LINE_STROKE_WIDTH = 0;
const DPI = 2
const CANVAS_ID = "myCanvas";

const log: Ref<string> = ref('');

let prev: InputPoint | null = null;
let ctx: CanvasRenderingContext2D | null = null;

const handWriter = useHandWriter(0, 10);

const pushPrevPoint = (p: InputPoint) => {
    prev = p;
}

const clearPrevPoints = () => {
    prev = null;
}

const pointFromEvent = (ev: PointerEvent): InputPoint => {
    return {
        x: ev.offsetX,
        y: ev.offsetY,
        pressure: ev.pressure
    };
}

const getCanvasContext = (): CanvasRenderingContext2D | null => {
    if(ctx) {
        return ctx;
    }

    const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement;
    canvas.width = 800 * DPI;
    canvas.height = 600 * DPI;

    ctx = canvas.getContext("2d");
    if (!ctx) {
        return null;
    }
    ctx.scale(DPI, DPI);
    return ctx;
}

const handlePointerDown = (ev: PointerEvent) => {
    // 始点のcap処理
    const ctx = getCanvasContext();
    if (!ctx) {
        return;
    }

    const current = pointFromEvent(ev);
    if (current.pressure === 0) {
        current.pressure = 0.1; // pressureが0の場合は最低値を設定
    }

    drawJoint(ctx, handWriter.convertToJoint(current));

    pushPrevPoint(current);
}

const handlePointerUp = (ev: PointerEvent) => {

    // 終点のcap処理
    const ctx = getCanvasContext();
    if (!ctx) {
        return;
    }

    const current = pointFromEvent(ev);
    if (current.pressure === 0) {
        current.pressure = 0.1; // pressureが0の場合は最低値を設定
    }

    if (prev) {
        const seg = handWriter.getSegment(prev, current)
        drawSegment(ctx, seg);
    }

    drawJoint(ctx, handWriter.convertToJoint(current));

    clearPrevPoints();
}

const handlePointerDraw = (ev: PointerEvent) => {
    const ctx = getCanvasContext();
    if (!ctx) {
        
        return;
    }

    const current = pointFromEvent(ev);
    console.log(current);

    // 線の描画
    if (prev ) {
        const seg = handWriter.getSegment(prev, current);
        drawSegment(ctx, seg);
        drawJoint(ctx, handWriter.convertToJoint(current));
    }

    // 点の保存
    prev = current;
}

/** segment = 台形を描画 */
const drawSegment = (ctx: CanvasRenderingContext2D, seg: Segment) => {
    ctx.strokeStyle = FILL_COLOR;
    ctx.fillStyle = FILL_COLOR;
    ctx.lineWidth = LINE_STROKE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(seg.start1.x, seg.start1.y);
    ctx.lineTo(seg.end1.x, seg.end1.y);
    ctx.lineTo(seg.end2.x, seg.end2.y);
    ctx.lineTo(seg.start2.x, seg.start2.y);
    ctx.closePath();
    ctx.fill();
}

const drawJoint = (ctx: CanvasRenderingContext2D, joint: Joint) => {
    ctx.strokeStyle = FILL_COLOR;
    ctx.fillStyle = FILL_COLOR;
    ctx.lineWidth = LINE_STROKE_WIDTH;
    ctx.beginPath();
    ctx.arc(joint.x, joint.y, joint.size, 0, 2 * Math.PI);
    ctx.fill();
}

</script>