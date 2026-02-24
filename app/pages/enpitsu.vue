<template>
    <toolHeader>
        <!-- https://iconify.design -->
        <div style="width: 100%;">
            <!-- row 1-->
            <div>
                enpitsu - a canvas drawing demo {{ debug }}
            </div>

            <!-- row 2-->
            <div>
                <ToolBtn @action="setPen1">
                    <Icon name="mdi:pencil" style="color: black;"></Icon>
                </ToolBtn>

                <ToolBtn @action="setPen2">
                    <Icon name="mdi:pencil" style="color: red;"></Icon>
                </ToolBtn>

                <ToolBtn @action="setRemover">
                    <Icon name="mdi:box-cutter-off" style="color: black;"></Icon>
                </ToolBtn>

                <ToolBtn @action="setEraser">
                    <Icon name="mdi:eraser" style="color: black;"></Icon>
                </ToolBtn>

                <ToolBtn @action="zoomIn">
                    <Icon name="mdi:magnify-plus" style="color: black;"></Icon>
                </ToolBtn>

                <ToolBtn @action="zoomOut">
                    <Icon name="mdi:magnify-minus" style="color: black;"></Icon>
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
import { StrokeStore, useStroke, useStrokeRenderer, useRemover, ViewportTransformer, type Controller, type Renderer, useEraser } from 'canvas2d'
import ToolBtn from '~/components/tool-btn.vue'
import ToolHeader from '~/components/tool-header.vue';
const CURRENT_CANVAS_ID = "current_canvas";
const CONFIRMED_CANVAS_ID = "confirmed_canvas"
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

const debug = ref('')

let transformer: ViewportTransformer | null = null
const model = new StrokeStore()
let controller: Controller | null
let confirmedRenderer: Renderer | null = null

let currentOffscreenCanvas: OffscreenCanvas | null = null

type toolKey = 'pen1' | 'pen2' | 'remover' | 'eraser'
const tools = new Map<toolKey, Controller>()

onMounted(() => {
    const DPR = window.devicePixelRatio || 1
    transformer = new ViewportTransformer(1.0, DPR)

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

    currentOffscreenCanvas = currentCanvas.transferControlToOffscreen()
    const confirmedOffscreenCanvas = confirmedCanvas.transferControlToOffscreen()

    const currentRenderer = useStrokeRenderer(currentOffscreenCanvas, transformer, model)
    confirmedRenderer = useStrokeRenderer(confirmedOffscreenCanvas, transformer, model)

    let isDown = false
    let isStrokeRendering = false
    currentCanvas.addEventListener('pointerdown', (ev) => {
        isDown = true
        controller?.startInput({
            x: ev.offsetX,
            y: ev.offsetY,
            pressure: ev.pressure,
            tags: ['down']
        })
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
        }
    })
    currentCanvas.addEventListener('pointerup', (ev) => {
        controller?.endInput({
            x: ev.offsetX,
            y: ev.offsetY,
            pressure: ev.pressure,
            tags: ['up']
        })

        isDown = false
    })

    controller = useStroke(transformer, model, {
        splinePoints: 10,
        pen: {
            r: 50,
            b: 50,
            g: 50,
            maxColorRatio: 1.0,
            minColorRatio: 0.5,
            maxThickness: 2,
            minThickness: 0.5,
        },
        startInputCallback() {
            currentRenderer!.renderCurrentStroke()
        },
        endInputCallback() {
            confirmedRenderer!.requestRenderConfirmedStrokes(() => {
                currentRenderer!.clear()

                console.log(model.getConfirmedStrokes())
            })
        },
        addInputPointCallback() {
            currentRenderer!.requestRenderCurrentStroke(()=> {
                isStrokeRendering = false
            })
        },
    })
    tools.set('pen1', controller)
    tools.set('pen2', useStroke(transformer, model, {
        splinePoints: 10,
        pen: {
            r: 255,
            b: 50,
            g: 50,
            maxColorRatio: 1.0,
            minColorRatio: 0.5,
            maxThickness: 6,
            minThickness: 0.5,
        },
        startInputCallback() {
            
        },
        endInputCallback() {
            confirmedRenderer!.requestRenderConfirmedStrokes()
            currentRenderer!.clear()
        },
        addInputPointCallback() {
            currentRenderer!.requestRenderCurrentStroke(()=> {
                isStrokeRendering = false
            })
        },
    }))
    tools.set('remover', useRemover(currentOffscreenCanvas, transformer, model, {
        size: 20,
        afterEndInput() {
            confirmedRenderer!.requestRenderAll()
            currentRenderer!.clear()
        },
        beforeAddInputPoint() {
            if (isStrokeRendering) {
                return
            }
            currentRenderer!.clear()
        },
        afterAddInputPoint() {
            confirmedRenderer!.requestRenderAll(()=> {
                isStrokeRendering = false
            })
        },
    }))
    tools.set('eraser', useEraser(currentOffscreenCanvas, transformer, model, {
        size: 20,
        afterEndInput() {
            // lower layer（ストロークを描画するレイヤーを再描画）  
            confirmedRenderer!.requestRenderAll()
            currentRenderer!.clear()
            console.log(model.getConfirmedStrokes())
        },
        beforeAddInputPoint() {
            if (isStrokeRendering) {
                return
            }
            currentRenderer!.clear()
        },
        afterAddInputPoint() {
            confirmedRenderer!.requestRenderAll(()=> {
                isStrokeRendering = false
            })
        },
    }))

    currentCanvas.addEventListener('wheel', (ev) => {
        ev.preventDefault()

        if (isStrokeRendering) {
            return
        }

        isStrokeRendering = true
        const dx = ev.deltaX
        const dy = ev.deltaY

        transformer!.dx -= dx
        transformer!.dy -= dy
        confirmedRenderer!.requestRenderAll(() => {
            isStrokeRendering = false
        })
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
    controller = tools.get('pen1')!
}

const setPen2 = () => {
    controller = tools.get('pen2')!
}

const setRemover = () => {
    controller = tools.get('remover')!
}

const setEraser = () => {
    controller = tools.get('eraser')!
}



const zoomIn = () => {
    transformer!.zoomRatio += 0.1
    confirmedRenderer!.requestRenderAll()
}

const zoomOut = () => {
    transformer!.zoomRatio -= 0.1
    confirmedRenderer!.requestRenderAll()
}

const scroll = (x: number, y: number) => {
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