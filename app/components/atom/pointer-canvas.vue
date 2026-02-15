<template>
    <canvas :id="canvasId" :width="800" :height="600" @pointerdown="handlePointerDown" @pointerup="handlePointerUp"
            @pointerleave="handlePointerUp" @pointermove="handlePointerMove" style="width: 800px; height: 600px;" />
</template>

<script setup lang="ts">

defineProps({
    canvasId: {
        type: String,
        required: true
    }
})

const emit = defineEmits<{
    'onPointerDown':[PointerEvent]
    'onPointerUp':[PointerEvent]
    'onPointerMove':[PointerEvent]
    'onPointerDraw': [PointerEvent]
}>();

let isPointerDown = false

const handlePointerDown = (ev: PointerEvent) => {
    isPointerDown = true;
    // 初期位置を設定して最初の描画イベントを送信
    emit('onPointerDown', ev);
    ev.preventDefault();
}

const handlePointerUp = (ev: PointerEvent) => {
    ev.preventDefault();
    isPointerDown = false;
    emit('onPointerUp', ev);
}

const handlePointerMove = (ev: PointerEvent) => {
    ev.preventDefault();
    emit('onPointerMove', ev);
    if (isPointerDown) {
        emit('onPointerDraw', ev);
    }
}

</script>

<style lang="css" scoped>
canvas {
    border: 1px solid #000000;
    background-color: transparent;
    user-select: none;
}
</style>