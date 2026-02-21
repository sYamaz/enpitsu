<template>
    <div style="touch-action: manipulation; height: 100%;">
        <canvas :id="CANVAS_ID" :width="CANVAS_WIDTH" :height="CANVAS_HEIGHT"
            :style="{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }" />
    </div>
</template>

<script setup lang="ts">
import { type InputPoint } from '~/utils/hand-writer'
import { Spline } from '~/utils/spline';

const INTERPORATE_POINTS = 10
const CANVAS_ID = "myCanvas";
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

const spline = new Spline()

const waitPoint: InputPoint[] = [];
const pendingStroke: InputPoint[] = [];
const submittedStrokes: InputPoint[][] = [];

let rafId: number | null = null;
let ctx: CanvasRenderingContext2D | null = null;

const hr = useHandWriter(0.5, 2, 1, 1, 128, 255)

const log = ref('')

onMounted(() => {
    const DPI = window.devicePixelRatio || 1

    const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement
    ctx = canvas.getContext('2d')!
    canvas.width = CANVAS_WIDTH * DPI
    canvas.height = CANVAS_HEIGHT * DPI
    ctx.scale(DPI, DPI)

    // ctx.globalCompositeOperation = 'multiply'
    ctx.globalCompositeOperation = 'source-over'

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

const renderJoint = (joint: Joint) => {
    const r = 255 - joint.darkness
    const g = 255 - joint.darkness
    const b = 255 - joint.darkness
    ctx!.fillStyle = `rgba(${r},${g},${b},${joint.alpha})`
    ctx!.lineWidth = 0
    ctx!.beginPath()
    ctx!.arc(joint.x, joint.y, joint.size, 0, Math.PI * 2)
    ctx!.closePath()
    ctx!.fill()
}

const renderSegment = (seg: Segment) => {
    const gradient = ctx!.createLinearGradient(seg.start.x, seg.start.y, seg.end.x, seg.end.y)
    gradient.addColorStop(0, `rgba(${255 - seg.start.darkness},${255 - seg.start.darkness},${255 - seg.start.darkness},${seg.start.alpha})`)
    gradient.addColorStop(1, `rgba(${255 - seg.start.darkness},${255 - seg.start.darkness},${255 - seg.start.darkness},${seg.end.alpha})`)

    ctx!.fillStyle = gradient
    ctx!.lineWidth = 0
    ctx!.beginPath()
    ctx!.moveTo(seg.start1.x, seg.start1.y)
    ctx!.lineTo(seg.end1.x, seg.end1.y)
    ctx!.lineTo(seg.end2.x, seg.end2.y)
    ctx!.lineTo(seg.start2.x, seg.start2.y)
    ctx!.closePath()
    ctx!.fill()
}

const render = (flush: boolean = false) => {
    // 過去3点(p0, p1, p2)と最新の1点(p3)を用いてスプライン補完を行い、
    // p1〜p2間を補完する
    //
    // 過去の点がない場合、最新の1点を用いてjointを描画する
    //
    // 過去の点が1または2点ある場合、最も新しい過去の点と最新の1点を用いてセグメントを描画する
    while (waitPoint.length > 0) {
        const current = waitPoint.shift()!
        switch (pendingStroke.length) {
            case 0:
                break;
            case 1:
                break;
            case 2:
                const first = pendingStroke[pendingStroke.length - 2]!
                const second = pendingStroke[pendingStroke.length - 1]!
                renderJoint(hr.convertToJoint(first))
                renderSegment(hr.getSegment(first, second))
                renderJoint(hr.convertToJoint(second))
                break;
            default: //spline
                const p0 = pendingStroke[pendingStroke.length - 3]!
                const p1 = pendingStroke[pendingStroke.length - 2]!
                const p2 = pendingStroke[pendingStroke.length - 1]!
                const p3 = current
                const startPressure = p1.pressure
                const endPressure = p2.pressure
                const dPressure = (endPressure - startPressure) / INTERPORATE_POINTS
                const ps = spline.interpolate(p0, p1, p2, p3, 0.5, INTERPORATE_POINTS)
                const points = [...ps, p2]
                let prev: InputPoint = p1
                points.forEach((p, i) => {
                    p.pressure = startPressure + i * dPressure
                    const seg = hr.getSegment(prev, p)
                    renderSegment(seg)
                    renderJoint(seg.end)
                    prev = p
                })
                break;
        }
        pendingStroke.push(current)
    }

    if (flush) { // 最後の２点間のセグメントは処理できてないのでflush時に描画
        const seg = hr.getSegment(pendingStroke[pendingStroke.length - 2]!, pendingStroke[pendingStroke.length - 1]!)
        renderSegment(seg)
        renderJoint(seg.end)

        submittedStrokes.push(pendingStroke)
        pendingStroke.splice(0)
    }

    rafId = null
}

let pointerDown = false

const pointFromEvent = (ev: PointerEvent): InputPoint => ({
    x: ev.offsetX,
    y: ev.offsetY,
    pressure: ev.pressure
})

const handlePointerDown = (ev: PointerEvent) => {
    pointerDown = true

    ev.preventDefault()
    const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement
    canvas.setPointerCapture(ev.pointerId)

    pushToWaitPoint(pointFromEvent(ev))
    render()
}

const handlePointerUp = (ev: PointerEvent) => {
    ev.preventDefault()
    pushToWaitPoint(pointFromEvent(ev))
    render(true)

    pointerDown = false
}

const handlePointerMove = (ev: PointerEvent) => {
    if (!pointerDown) {
        return
    }

    ev.preventDefault()

    if (!rafId) {
        pushToWaitPoint(pointFromEvent(ev))
        rafId = requestAnimationFrame(() => render())
    } else {
        console.log("Skip move")
    }
}

const pushToWaitPoint = (p: InputPoint): boolean => {
    if (waitPoint.length > 0) {
        const last = waitPoint[waitPoint.length - 1]!
        if ((last.x === p.x) && (last.y === p.y)) {
            // pressureが大きい方を残す
            const pressure = Math.max(last.pressure, p.pressure)
            waitPoint[waitPoint.length - 1]!.pressure = pressure
            return false
        }
    } else if (pendingStroke.length > 0) {
        const last = pendingStroke[pendingStroke.length - 1]!
        if ((last.x === p.x) && (last.y === p.y)) {
            const pressure = Math.max(last.pressure, p.pressure)
            pendingStroke[pendingStroke.length - 1]!.pressure = pressure
            return false
        }
    }

    waitPoint.push(p)
    return true
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