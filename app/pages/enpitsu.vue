<template>
    <div id="menu">
        <button @click="setPen1">pen(black)</button>
        <button @click="setPen2">pen(red)</button>
        <button @click="">selector</button>

        <button @click="zoomIn">zoom in</button>
        <button @click="zoomOut">zoom out</button>
        <button @click="zoomReset">zoom reset</button>

        <button @click="() => scroll(-10, 0)">scroll left</button>
        <button @click="() => scroll(10, 0)">scroll right</button>
        <button @click="() => scroll(0, -10)">scroll top</button>
        <button @click="() => scroll(0, 10)">scroll bottom</button>
    </div>
    <div style="touch-action: manipulation; height: 100%; position: relative;">
        <canvas :id="CURRENT_CANVAS_ID" style="position: absolute; z-index: 2; background-color: transparent;" />
        <canvas :id="CONFIRMED_CANVAS_ID" style="position: absolute; z-index: 1;" />
    </div>
</template>

<script setup lang="ts">
import { SimpleStore, useEnpitsu, useRenderer, ViewportTransformer, type Controller, type Renderer } from 'canvas2d'
const CURRENT_CANVAS_ID = "current_canvas";
const CONFIRMED_CANVAS_ID = "confirmed_canvas"
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

let transformer: ViewportTransformer | null = null
const model = new SimpleStore()
let controller: Controller | null
let confirmedRenderer: Renderer | null = null

onMounted(() => {
    const DPR = window.devicePixelRatio || 1
    transformer = new ViewportTransformer(0.1, 1.0, DPR)

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

    // // ctx.globalCompositeOperation = 'multiply'
    // ctx.globalCompositeOperation = 'source-over'

    const currentOffscreenCanvas = currentCanvas.transferControlToOffscreen()
    const confirmedOffscreenCanvas = confirmedCanvas.transferControlToOffscreen()

    const currentRenderer = useRenderer(currentOffscreenCanvas, transformer, model)
    confirmedRenderer = useRenderer(confirmedOffscreenCanvas, transformer, model)

    controller = useEnpitsu(transformer, model, 10, {
        r: 50,
        b: 50,
        g: 50,
        maxColorRatio: 1.0,
        minColorRatio: 0.5,
        maxThickness: 2,
        minThickness: 0.5
    })

    let isDown = false
    let isStrokeRendering = false
    currentCanvas.addEventListener('pointerdown', (ev) => {
        isDown = true
        controller?.startInput()

        controller?.addInputPoint({
            x: ev.offsetX,
            y: ev.offsetY,
            pressure: ev.pressure,
            tags: ['down']
        })

        currentRenderer.renderCurrentStroke()
    })
    currentCanvas.addEventListener('pointermove', (ev) => {
        if (!isDown) return

        if (!isStrokeRendering) {
            controller?.addInputPoint({
                x: ev.offsetX,
                y: ev.offsetY,
                pressure: ev.pressure,
                tags: ['move']
            })
            currentRenderer.requestRenderCurrentStroke(() => {
                isStrokeRendering = false
            })
        }
    })
    currentCanvas.addEventListener('pointerup', (ev) => {
        controller?.addInputPoint({
            x: ev.offsetX,
            y: ev.offsetY,
            pressure: ev.pressure,
            tags: ['up']
        })
        currentRenderer.requestRenderCurrentStroke(() => {
            controller?.endInput()

            confirmedRenderer?.requestRenderConfirmedStrokes(() => {
                currentRenderer.clear()
            })
        })
        
        
        isDown = false
    })

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
    controller = useEnpitsu(transformer!, model, 10, {
        r: 50,
        b: 50,
        g: 50,
        maxColorRatio: 1.0,
        minColorRatio: 0.5,
        maxThickness: 2,
        minThickness: 0.5
    })
}

const setPen2 = () => {
    controller = useEnpitsu(transformer!, model, 10, {
        r: 255,
        b: 50,
        g: 50,
        maxColorRatio: 1.0,
        minColorRatio: 0.5,
        maxThickness: 6,
        minThickness: 0.5
    })
}

const zoomIn = () => {
    transformer!.incrementZoomRatio()
    confirmedRenderer!.requestRenderAll()
}

const zoomOut = () => {
    transformer!.decrementZoomRatio()
    confirmedRenderer!.requestRenderAll()
}

const zoomReset = () => {
    transformer!.resetZoomRatio()
    confirmedRenderer!.requestRenderAll()
}

const scroll = (x:number, y:number) => {
    transformer!.dx += x
    transformer!.dy += y
    confirmedRenderer!.requestRenderAll()
}



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