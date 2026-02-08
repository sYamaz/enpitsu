<template>
    <UContainer style="touch-action: none;">
        <pointerCanvas :canvasId="CANVAS_ID" @onPointerDown="handlePointerDown" @onPointerUp="handlePointerUp"
             @onPointerDraw="handlePointerDraw" />
        <p>{{ log }}</p>
    </UContainer>
</template>

<script setup lang="ts">
import {type InputPoint, drawCap, drawSegment} from '~/utils/canvas'
import pointerCanvas from '~/components/atom/pointer-canvas.vue';

const CANVAS_ID = "myCanvas";

const log: Ref<string> = ref("");

let prev: InputPoint | null = null;

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

    if (prev) {
        drawSegment(ctx, prev, current);
    }

    clearPrevPoints();
}

const handlePointerDraw = (ev: PointerEvent) => {
    const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        return;
    }

    const current = pointFromEvent(ev);

    // 線の描画
    if (prev ) {
        drawSegment(ctx, prev, current);
    }

    // 点の保存
    prev = current;
}

</script>