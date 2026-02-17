<template>
    <div style="touch-action: manipulation; height: 100%;">
        <canvas :id="CANVAS_ID" :width="CANVAS_WIDTH" :height="CANVAS_HEIGHT"
            :style="{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }" />
    </div>
</template>

<script setup lang="ts">
import { type InputPoint } from '~/utils/hand-writer'
import { Spline } from '~/utils/spline';

const CANVAS_ID = "myCanvas";
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
let DPI = 1

const spline = new Spline()

interface QueuedEvent {
    type: 'inkdown' | 'inkdraw' | 'inkup';
    point: InputPoint;
}

const pendingStroke: QueuedEvent[] = [];
let last: QueuedEvent | null = null;
let rafId: number | null = null;
let ctx: CanvasRenderingContext2D | null = null;

const hr = useHandWriter(0.1, 2)

onMounted(() => {
    DPI = window.devicePixelRatio || 1

    const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement
    canvas.width = CANVAS_WIDTH * DPI
    canvas.height = CANVAS_HEIGHT * DPI

    ctx = canvas.getContext('2d')!  // ← constなし
    ctx.scale(DPI, DPI)

    canvas.addEventListener('pointerdown', handlePointerDown, { passive: false })
    canvas.addEventListener('pointermove', handlePointerMove, { passive: false })
    canvas.addEventListener('pointerup', handlePointerUp, { passive: false })

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

const render = () => {
    while (pendingStroke.length > 0) {  // 1個じゃなく全部処理
        const first = pendingStroke.shift()!

        switch (first.type) {
            case 'inkdown': {
                const joint = hr.convertToJoint(first.point)
                ctx!.fillStyle = 'black'
                ctx!.beginPath()
                ctx!.arc(joint.x, joint.y, joint.size, 0, Math.PI * 2)
                ctx!.closePath()
                ctx!.fill()
                break
            }
            case 'inkdraw': {
                const joint = hr.convertToJoint(first.point)
                ctx!.fillStyle = 'black'
                ctx!.beginPath()
                ctx!.arc(joint.x, joint.y, joint.size, 0, Math.PI * 2)
                ctx!.closePath()
                ctx!.fill()

                if (last) {
                    const seg = hr.getSegment(last.point, first.point)
                    ctx!.fillStyle = 'black'
                    ctx!.beginPath()
                    ctx!.moveTo(seg.start1.x, seg.start1.y)
                    ctx!.lineTo(seg.end1.x, seg.end1.y)
                    ctx!.lineTo(seg.end2.x, seg.end2.y)
                    ctx!.lineTo(seg.start2.x, seg.start2.y)
                    ctx!.closePath()
                    ctx!.fill()
                }
                break
            }
            case 'inkup': {
                const joint = hr.convertToJoint(first.point)
                ctx!.fillStyle = 'black'
                ctx!.beginPath()
                ctx!.arc(joint.x, joint.y, joint.size, 0, Math.PI * 2)
                ctx!.closePath()
                ctx!.fill()

                if (last) {
                    const seg = hr.getSegment(last.point, first.point)
                    ctx!.fillStyle = 'black'
                    ctx!.beginPath()
                    ctx!.moveTo(seg.start1.x, seg.start1.y)
                    ctx!.lineTo(seg.end1.x, seg.end1.y)
                    ctx!.lineTo(seg.end2.x, seg.end2.y)
                    ctx!.lineTo(seg.start2.x, seg.start2.y)
                    ctx!.closePath()
                    ctx!.fill()
                }
                break
            }
        }

        last = first
    }

    rafId = null
}

const pointFromEvent = (ev: PointerEvent): InputPoint => ({
    x: ev.offsetX,
    y: ev.offsetY,
    pressure: ev.pressure
})

const handlePointerDown = (ev: PointerEvent) => {
    ev.preventDefault()
    const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement
    canvas.setPointerCapture(ev.pointerId)

    pendingStroke.push({ type: 'inkdown', point: pointFromEvent(ev) })
    render()
}

const handlePointerUp = (ev: PointerEvent) => {
    ev.preventDefault()
    const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement
    canvas.releasePointerCapture(ev.pointerId)

    pendingStroke.push({ type: 'inkup', point: pointFromEvent(ev) })
    render()
}

const handlePointerMove = (ev: PointerEvent) => {
    ev.preventDefault()

    if (!rafId) {
        pendingStroke.push({ type: 'inkdraw', point: pointFromEvent(ev) })
        rafId = requestAnimationFrame(render)
    }
}
</script>

<style scoped>
canvas {
    border: 1px solid #000000;
    background-color: white;
    touch-action: manipulation !important;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
}
</style>