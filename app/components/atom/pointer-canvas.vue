<template>
    <canvas :id="canvasId" width="800" height="600" @pointerdown="handlePointerDown" @pointerup="handlePointerUp"
            @pointerleave="" @pointermove="handlePointerMove" style="width: 800px; height: 600px;" />
</template>

<script setup lang="ts">
defineProps<{canvasId: string}>();

const emit = defineEmits<{
    'onPointerDown':[PointerEvent]
    'onPointerUp':[PointerEvent]
    'onPointerMove':[PointerEvent]
    'onPointerDraw': [PointerEvent]
}>();

const isPointerDown = ref<boolean>(false)

const handlePointerDown = (ev: PointerEvent) => {
    ev.preventDefault();
    isPointerDown.value = true;
    emit('onPointerDown', ev);
}

const handlePointerUp = (ev: PointerEvent) => {
    ev.preventDefault();
    isPointerDown.value = false;
    emit('onPointerUp', ev);
}

const handlePointerMove = (ev: PointerEvent) => {
    ev.preventDefault();
    emit('onPointerMove', ev);
    if (isPointerDown.value) {
        emit('onPointerDraw', ev);
    }
}

</script>

<style lang="css" scoped>
canvas {
    border: 1px solid #000000;
    background-color: white;
    user-select: none;
}
</style>