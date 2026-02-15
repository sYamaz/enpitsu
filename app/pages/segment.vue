<template>
    <UContainer style="touch-action: none;">
        <pointerCanvas ref="canvasRef" style="background-color: white;" :canvasId="CANVAS_ID"
            @onPointerDown="handlePointerDown" @onPointerUp="handlePointerUp" @onPointerDraw="handlePointerDraw" />
        <p style="user-select: none;pointer-events: none;">{{ log }}</p>
    </UContainer>
</template>

<script setup lang="ts">
import { type InputPoint } from '~/utils/hand-writer'
import pointerCanvas from '~/components/atom/pointer-canvas.vue';
import CustomWorker from '~/workers/worker.ts?worker';
const CANVAS_ID = "myCanvas";

interface QueuedEvent {
  type: 'indown' | 'inkdraw' | 'inkup';
  point: InputPoint;
  timestamp: number;
}

// イベントキュー
const eventQueue: QueuedEvent[] = [];
let rafId: number | null = null;
let lastSendTime = 0;
const SEND_INTERVAL = 8; // 8ms = 約120fps（16msだと60fps）

const log: Ref<string> = ref('');

let offscreen:OffscreenCanvas | null = null;

let worker: Worker | null = null;

onMounted(() => {
    worker = new CustomWorker();

    const dpi = window.devicePixelRatio || 1;
    

    const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement;
    // OffscreenCanvasに転送して描画のパフォーマンスを向上させる
    offscreen = canvas.transferControlToOffscreen();

    worker!.postMessage({type: 'init', data: {canvas: offscreen, dpi}}, [offscreen]);
})

// バッチ送信
const flushQueue = (now: number) => {
  // 前回の送信から十分時間が経過しているか
  if (now - lastSendTime < SEND_INTERVAL) {
    rafId = requestAnimationFrame(flushQueue);
    return;
  }
  
  if (eventQueue.length === 0) {
    rafId = null;
    return;
  }
  
  // キューの内容を全て取り出して送信
  const batch = eventQueue.splice(0, eventQueue.length);
  
  console.log(`[Main] Sending batch of ${batch.length} events`);
  worker?.postMessage({
    type: 'batch',
    data: { events: batch }
  });
  
  lastSendTime = now;
  
  // 次のフレームで再度チェック
  rafId = requestAnimationFrame(flushQueue);
};

const addToQueue = (type: QueuedEvent['type'], e: PointerEvent) => {
  eventQueue.push({
    type,
    point: {
      x: e.offsetX,
      y: e.offsetY,
      pressure: e.pressure || 0.5
    },
    timestamp: performance.now()
  });
  
  // rAFループが動いていなければ開始
  if (!rafId) {
    rafId = requestAnimationFrame(flushQueue);
  }
};

const pointFromEvent = (ev: PointerEvent): InputPoint => {
    return {
        x: ev.offsetX,
        y: ev.offsetY,
        pressure: ev.pressure
    };
}

const handlePointerDown = (ev: PointerEvent) => {
    const current = pointFromEvent(ev);
    worker!.postMessage({type: 'inkdown', data: {point: current}});
}

const handlePointerUp = (ev: PointerEvent) => {
    const current = pointFromEvent(ev);
    worker!.postMessage({type: 'inkup', data: {point: current}});
}

const handlePointerDraw = (ev: PointerEvent) => {
    const current = pointFromEvent(ev);
    worker!.postMessage({type: 'inkdraw', data: {point: current}});
}

</script>