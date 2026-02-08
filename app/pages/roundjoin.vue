<template>
    <UContainer style="touch-action: none;">
        <pointerCanvas :canvasId="CANVAS_ID" @onPointerDown="handlePointerDown" @onPointerUp="handlePointerUp"
             @onPointerDraw="handlePointerDraw" />
        <p>{{ log }}</p>
    </UContainer>
</template>

<script setup lang="ts">
import {type InputPoint, drawSegment, drawRoundJoinedLines, drawCap} from '~/utils/canvas'
import pointerCanvas from '~/components/atom/pointer-canvas.vue';

const CANVAS_ID = "myCanvas";


const log: Ref<string> = ref("");

const points: InputPoint[] = [];

const pushPrevPoint = (p: InputPoint) => {
    points.push(p);
}

const clearPrevPoints = () => {
    points.splice(0);
}

const pointFromEvent = (ev: PointerEvent): InputPoint => {
    return {
        x: ev.offsetX,
        y: ev.offsetY,
        pressure: ev.pressure
    };
}

const handlePointerDown = (ev: PointerEvent) => {

    // 始点のcap処理
    const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        return;
    }

    const current = pointFromEvent(ev);
    if (current.pressure === 0) {
        current.pressure = 0.1; // pressureが0の場合は最低値を設定
    }

    drawCap(ctx, current);

    pushPrevPoint(current);
}

const handlePointerUp = (ev: PointerEvent) => {

    // 終点のcap処理
    const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        return;
    }

    const current = pointFromEvent(ev);
    if (current.pressure === 0) {
        current.pressure = 0.1; // pressureが0の場合は最低値を設定
    }

    if (points.length > 1) {
        drawSegment(ctx, points[points.length - 1]!, current);
    }

    clearPrevPoints();
}

const handlePointerDraw = (ev: PointerEvent) => {
    const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const current = pointFromEvent(ev);

    // 線の描画
    if (points.length > 2 ) {
        drawRoundJoinedLines(ctx, [...points, current]);
    }

    // 点の保存
    pushPrevPoint(current);
}

</script>