<template>
    <toolHeader>
        <!-- https://iconify.design -->
        <div style="width: 100%;">
            <!-- row 1-->
            <div>
                enpitsu - a canvas drawing demo {{ debug }}
            </div>

            <!-- row 2: 通常ツール (リプレイ中は非表示) -->
            <div v-if="!replayController">
                <ToolBtn @action="setPen1">
                    <Icon name="mdi:pencil" style="color: black;"></Icon>
                </ToolBtn>

                <ToolBtn @action="setRemover">
                    <Icon name="mdi:box-cutter-off" style="color: black;"></Icon>
                </ToolBtn>

                <ToolBtn @action="setEraser">
                    <Icon name="mdi:eraser" style="color: black;"></Icon>
                </ToolBtn>

                <ToolBtn @action="setSelector">
                    <Icon name="mdi:cursor-default" style="color: black;"></Icon>
                </ToolBtn>

                <ToolBtn @action="undoAction">
                    <Icon name="mdi:undo" style="color: black;"></Icon>
                </ToolBtn>

                <ToolBtn @action="redoAction">
                    <Icon name="mdi:redo" style="color: black;"></Icon>
                </ToolBtn>

                <ToolBtn @action="startReplay">
                    <Icon name="mdi:play" style="color: black;"></Icon>
                </ToolBtn>
            </div>

            <!-- row 2: リプレイコントロール -->
            <div v-else style="display: flex; align-items: center; gap: 8px;">
                <ToolBtn @action="toggleReplayPlay">
                    <Icon :name="replayIsPlaying ? 'mdi:pause' : 'mdi:play'" style="color: black;"></Icon>
                </ToolBtn>
                <input
                    type="range"
                    min="0"
                    max="1000"
                    step="1"
                    :value="Math.round(replayProgress * 1000)"
                    @input="onSeekInput"
                    style="flex: 1; min-width: 120px;"
                />
                <ToolBtn @action="stopReplay">
                    <Icon name="mdi:stop" style="color: black;"></Icon>
                </ToolBtn>
            </div>
        </div>

    </toolHeader>
    <div style="touch-action: manipulation; height: 100%; position: relative; margin: 8px;">
        <canvas :tabindex="1" :id="CURRENT_CANVAS_ID"
            style="position: absolute; z-index: 2; background-color: transparent;" />
        <canvas :id="CONFIRMED_CANVAS_ID" style="position: absolute; z-index: 1;" />
    </div>
</template>

<script setup lang="ts">
definePageMeta({ ssr: false })

import ToolBtn from '~/components/tool-btn.vue'
import ToolHeader from '~/components/tool-header.vue';
import { useEnpitsu, type Enpitsu, type ReplayController } from 'canvas2d'
const CURRENT_CANVAS_ID = "current_canvas";
const CONFIRMED_CANVAS_ID = "confirmed_canvas"
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

const debug = ref('')

let enpitsu: Enpitsu | null = null

// Replay state
const replayController = ref<ReplayController | null>(null)
const replayProgress = ref(0)
const replayIsPlaying = ref(false)

let replayRafId = 0

const _syncReplayState = () => {
    if (!replayController.value) return
    replayProgress.value = replayController.value.progress
    replayIsPlaying.value = replayController.value.isPlaying
    if (replayController.value.isPlaying) {
        replayRafId = requestAnimationFrame(_syncReplayState)
    }
}

onUnmounted(() => {
    cancelAnimationFrame(replayRafId)
    replayController.value?.destroy()
    enpitsu?.destroy()
})

onMounted(() => {
    const DPR = window.devicePixelRatio || 1

    const currentCanvas = document.getElementById(CURRENT_CANVAS_ID) as HTMLCanvasElement
    const confirmedCanvas = document.getElementById(CONFIRMED_CANVAS_ID) as HTMLCanvasElement

    // HTML側のcanvasにDPR込みサイズを直接セット（transferする前に！）
    currentCanvas.width = CANVAS_WIDTH * DPR
    currentCanvas.height = CANVAS_HEIGHT * DPR
    confirmedCanvas.width = CANVAS_WIDTH * DPR
    confirmedCanvas.height = CANVAS_HEIGHT * DPR

    // CSSサイズは論理ピクセルのまま
    currentCanvas.style.width = `${CANVAS_WIDTH}px`
    currentCanvas.style.height = `${CANVAS_HEIGHT}px`
    confirmedCanvas.style.width = `${CANVAS_WIDTH}px`
    confirmedCanvas.style.height = `${CANVAS_HEIGHT}px`

    enpitsu = useEnpitsu(currentCanvas, confirmedCanvas)

    window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault()
            if (e.shiftKey) enpitsu?.redo()
            else enpitsu?.undo()
        }
    })

    // // ctx.globalCompositeOperation = 'multiply'
    // ctx.globalCompositeOperation = 'source-over'

    // 必ずしも必要ではなさそう
    // document.addEventListener('gesturestart', (ev) => ev.preventDefault(), { passive: false });
    // document.addEventListener('gesturechange', (ev) => ev.preventDefault(), { passive: false });
    // document.addEventListener('gestureend', (ev) => ev.preventDefault(), { passive: false });
    // document.addEventListener('dblclick', (ev) => ev.preventDefault(), { passive: false });
    // document.addEventListener('contextmenu', (ev) => ev.preventDefault(), { passive: false });

    // 速記レベルでpointer eventが抜ける場合がある
    //
    // touchイベントをキャンセルすることで対応している
    document.addEventListener('touchstart', (ev) => {
        ev.preventDefault();
    }, { passive: false });

    // 速記レベルでpointer eventが抜けるのに効くかと思ったけどそうでもなさそう
    // document.addEventListener('selectstart', (ev) => {
    //     ev.preventDefault();
    // });
})

const setPen1 = () => {
    enpitsu?.useTool('pen')
}

const setRemover = () => {
    enpitsu?.useTool('remover')
}

const setEraser = () => {
    enpitsu?.useTool('eraser')
}

const setSelector = () => {
    enpitsu?.useTool('selector')
}

const undoAction = () => {
    enpitsu?.undo()
}

const redoAction = () => {
    enpitsu?.redo()
}

const startReplay = () => {
    if (!enpitsu) return
    replayController.value = enpitsu.startReplay()
    replayProgress.value = 0
    replayIsPlaying.value = false
}

const toggleReplayPlay = () => {
    const ctrl = replayController.value
    if (!ctrl) return
    if (ctrl.isPlaying) {
        ctrl.pause()
        cancelAnimationFrame(replayRafId)
        replayIsPlaying.value = false
    } else {
        ctrl.play()
        replayRafId = requestAnimationFrame(_syncReplayState)
    }
}

const onSeekInput = (e: Event) => {
    const ctrl = replayController.value
    if (!ctrl) return
    const val = Number((e.target as HTMLInputElement).value)
    ctrl.seek(val / 1000)
    replayProgress.value = ctrl.progress
}

const stopReplay = () => {
    cancelAnimationFrame(replayRafId)
    replayController.value?.destroy()
    replayController.value = null
    replayProgress.value = 0
    replayIsPlaying.value = false
}


// const zoomIn = () => {
//     transformer!.zoomRatio += 0.1
//     confirmedRenderer!.requestRenderAll()
// }

// const zoomOut = () => {
//     transformer!.zoomRatio -= 0.1
//     confirmedRenderer!.requestRenderAll()
// }

// const scroll = (x: number, y: number) => {
//     transformer!.dx += x
//     transformer!.dy += y
//     confirmedRenderer!.requestRenderAll()
// }



</script>

<style scoped>
canvas {
    border: 1px solid #000000;
    touch-action: manipulation !important;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
}
</style>