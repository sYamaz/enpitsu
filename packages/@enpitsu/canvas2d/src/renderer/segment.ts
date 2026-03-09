import { InputPoint, Pen, Point } from "types";

const colorStyleFromPen = (pressure: number, pen: Pen): string => {
    const alpha = pen.alpha ?? 1
    const r = pen.r + (1 - pressure) * ((255 - pen.r) * (1 - pen.minColorRatio))
    const g = pen.g + (1 - pressure) * ((255 - pen.g) * (1 - pen.minColorRatio))
    const b = pen.b + (1 - pressure) * ((255 - pen.b) * (1 - pen.minColorRatio))
    return `rgba(${r},${g},${b},${alpha})`
}

const radiusFromPen = (pressure: number, pen: Pen): number => {
    return pen.minThickness + pressure * (pen.maxThickness - pen.minThickness)
}

export type StrokeRenderData = {
    path: Path2D
    fillStyle: string | CanvasGradient
}

export const buildStrokeRenderData = (
    ctx: OffscreenCanvasRenderingContext2D,
    points: InputPoint[],
    pen: Pen,
    offset?: Point
): StrokeRenderData | null => {
    if (points.length === 0) return null

    const ox = offset?.x ?? 0
    const oy = offset?.y ?? 0
    const pts = points.map(p => ({ x: p.x + ox, y: p.y + oy, pressure: p.pressure }))

    const path = new Path2D()

    if (pts.length === 1) {
        const r = radiusFromPen(pts[0].pressure, pen)
        path.arc(pts[0].x, pts[0].y, r, 0, Math.PI * 2)
        return { path, fillStyle: colorStyleFromPen(pts[0].pressure, pen) }
    }

    const n = pts.length

    // Compute unit tangents at each point
    const tangents: { tx: number; ty: number }[] = []
    for (let i = 0; i < n; i++) {
        let dx: number, dy: number
        if (i === 0) {
            dx = pts[1].x - pts[0].x
            dy = pts[1].y - pts[0].y
        } else if (i === n - 1) {
            dx = pts[n - 1].x - pts[n - 2].x
            dy = pts[n - 1].y - pts[n - 2].y
        } else {
            dx = pts[i + 1].x - pts[i - 1].x
            dy = pts[i + 1].y - pts[i - 1].y
        }
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len > 0) {
            tangents.push({ tx: dx / len, ty: dy / len })
        } else {
            // Carry forward previous valid tangent
            tangents.push(i > 0 ? tangents[i - 1] : { tx: 1, ty: 0 })
        }
    }

    // Compute radii and edge points
    const radii = pts.map(p => radiusFromPen(p.pressure, pen))
    // leftNormal = (-ty, tx), rightNormal = (ty, -tx)
    const leftPoints = pts.map((p, i) => ({
        x: p.x + (-tangents[i].ty) * radii[i],
        y: p.y + tangents[i].tx * radii[i]
    }))
    const rightPoints = pts.map((p, i) => ({
        x: p.x + tangents[i].ty * radii[i],
        y: p.y + (-tangents[i].tx) * radii[i]
    }))

    // Build outline path
    path.moveTo(leftPoints[0].x, leftPoints[0].y)
    for (let i = 1; i < n; i++) {
        path.lineTo(leftPoints[i].x, leftPoints[i].y)
    }

    // End cap: arc from leftNormalAngle to rightNormalAngle, anticlockwise
    const et = tangents[n - 1]
    const er = radii[n - 1]
    const ep = pts[n - 1]
    const leftAngleEnd = Math.atan2(et.tx, -et.ty)
    const rightAngleEnd = Math.atan2(-et.tx, et.ty)
    path.arc(ep.x, ep.y, er, leftAngleEnd, rightAngleEnd, true)

    // Right edge backward
    for (let i = n - 2; i >= 0; i--) {
        path.lineTo(rightPoints[i].x, rightPoints[i].y)
    }

    // Start cap: arc from rightNormalAngle to leftNormalAngle, anticlockwise
    const st = tangents[0]
    const sr = radii[0]
    const sp = pts[0]
    const leftAngleStart = Math.atan2(st.tx, -st.ty)
    const rightAngleStart = Math.atan2(-st.tx, st.ty)
    path.arc(sp.x, sp.y, sr, rightAngleStart, leftAngleStart, true)

    path.closePath()

    // Gradient fill along start→end axis (up to 20 color stops)
    let fillStyle: string | CanvasGradient
    const dx = pts[n - 1].x - pts[0].x
    const dy = pts[n - 1].y - pts[0].y
    if (Math.sqrt(dx * dx + dy * dy) < 0.001) {
        // Degenerate: start and end at same position, use middle point color
        fillStyle = colorStyleFromPen(pts[Math.floor(n / 2)].pressure, pen)
    } else {
        const gradient = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[n - 1].x, pts[n - 1].y)
        const stopCount = Math.min(n, 20)
        for (let s = 0; s < stopCount; s++) {
            const idx = Math.round(s * (n - 1) / (stopCount - 1))
            const t = s / (stopCount - 1)
            gradient.addColorStop(t, colorStyleFromPen(pts[idx].pressure, pen))
        }
        fillStyle = gradient
    }

    return { path, fillStyle }
}
