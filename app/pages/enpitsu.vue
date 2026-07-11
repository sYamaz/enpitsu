<template>
  <div class="enpitsu-page">
    <toolHeader>
        <!-- https://iconify.design -->
        <div class="toolbar">
            <div class="toolbar__brand">
                <NuxtLink to="/" class="toolbar__name">enpitsu</NuxtLink>
            </div>

            <!-- 通常ツール (リプレイ中は非表示) -->
            <div v-if="!replayController" class="toolbar__tools">
                <ToolBtn :active="activeTool === 'pen'" @action="setPen1">
                    <Icon name="mdi:pencil" />
                </ToolBtn>

                <ToolBtn :active="activeTool === 'remover'" @action="setRemover">
                    <Icon name="mdi:box-cutter-off" />
                </ToolBtn>

                <ToolBtn :active="activeTool === 'eraser'" @action="setEraser">
                    <Icon name="mdi:eraser" />
                </ToolBtn>

                <ToolBtn :active="activeTool === 'selector'" @action="setSelector">
                    <Icon name="mdi:cursor-default" />
                </ToolBtn>

                <span class="toolbar__divider" />

                <ToolBtn @action="undoAction">
                    <Icon name="mdi:undo" />
                </ToolBtn>

                <ToolBtn @action="redoAction">
                    <Icon name="mdi:redo" />
                </ToolBtn>

                <span class="toolbar__divider" />

                <ToolBtn @action="startReplay">
                    <Icon name="mdi:play" />
                </ToolBtn>
            </div>

            <!-- リプレイコントロール -->
            <div v-else class="toolbar__replay">
                <ToolBtn @action="toggleReplayPlay">
                    <Icon :name="replayIsPlaying ? 'mdi:pause' : 'mdi:play'" />
                </ToolBtn>
                <input
                    type="range"
                    min="0"
                    max="1000"
                    step="1"
                    :value="Math.round(replayProgress * 1000)"
                    @input="onSeekInput"
                    class="toolbar__seek"
                />
                <ToolBtn @action="stopReplay">
                    <Icon name="mdi:stop" />
                </ToolBtn>
            </div>
        </div>
    </toolHeader>

    <div class="canvas-stage">
        <p v-if="unsupported" class="unsupported">
            お使いのブラウザは OffscreenCanvas に対応していないため描画できません。<br>
            Safari 16.4 以降、または最新の Chrome / Firefox でお試しください。
        </p>
        <div v-show="!unsupported" class="canvas-wrap">
            <canvas :tabindex="1" :id="CURRENT_CANVAS_ID" class="canvas canvas--current" />
            <canvas :id="CONFIRMED_CANVAS_ID" class="canvas canvas--confirmed" />
        </div>
    </div>
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

let enpitsu: Enpitsu | null = null

// 選択中ツール（ツールボタンのアクティブ表示に使う）
const activeTool = ref<string>('pen')

// OffscreenCanvas 非対応ブラウザ（古い iOS Safari 等）向けフォールバック表示
const unsupported = ref(false)

const onKeydown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) enpitsu?.redo()
        else enpitsu?.undo()
    }
}

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
    window.removeEventListener('keydown', onKeydown)
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

    try {
        enpitsu = useEnpitsu(currentCanvas, confirmedCanvas)
        // 既定でペンを選択しておく（起動直後から描けるように）
        enpitsu.useTool('pen')
        activeTool.value = 'pen'
    } catch (e) {
        // OffscreenCanvas 非対応など初期化に失敗した場合はフォールバック表示に切り替える
        console.error('[enpitsu] failed to initialize drawing engine', e)
        unsupported.value = true
        return
    }

    window.addEventListener('keydown', onKeydown)
})

const setPen1 = () => {
    enpitsu?.useTool('pen')
    activeTool.value = 'pen'
}

const setRemover = () => {
    enpitsu?.useTool('remover')
    activeTool.value = 'remover'
}

const setEraser = () => {
    enpitsu?.useTool('eraser')
    activeTool.value = 'eraser'
}

const setSelector = () => {
    enpitsu?.useTool('selector')
    activeTool.value = 'selector'
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
</script>

<style scoped>
.enpitsu-page {
    display: flex;
    flex-direction: column;
    height: 100dvh;
}

.toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    width: 100%;
}

.toolbar__brand {
    flex-shrink: 0;
}

.toolbar__name {
    font-family: var(--font-serif);
    font-size: var(--text-lg);
    font-weight: 600;
    letter-spacing: var(--tracking-tight);
}

.toolbar__name:hover {
    text-decoration: none;
    opacity: 0.6;
}

.toolbar__tools,
.toolbar__replay {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 1;
}

.toolbar__divider {
    width: 1px;
    align-self: stretch;
    margin: 4px var(--space-2);
    background-color: var(--line);
}

.toolbar__seek {
    flex: 1;
    min-width: 120px;
    accent-color: var(--ink);
}

.canvas-stage {
    flex: 1;
    display: grid;
    place-items: center;
    padding: var(--space-5);
    overflow: auto;
    background-color: var(--paper-alt);
}

.unsupported {
    max-width: 32em;
    text-align: center;
    color: var(--ink-muted);
    line-height: var(--leading-body);
}

.canvas-wrap {
    position: relative;
    box-sizing: content-box;
    width: 800px;
    height: 600px;
    border: 1px solid var(--line);
    background-color: var(--paper);
    flex-shrink: 0;
}

.canvas {
    position: absolute;
    top: 0;
    left: 0;
    box-sizing: content-box;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
}

.canvas--current {
    z-index: 2;
    background-color: transparent;
    /* ブラウザにジェスチャ（スクロール/ズーム）を奪われないようにする */
    touch-action: none;
}

.canvas--confirmed {
    z-index: 1;
    background-color: transparent;
}
</style>
