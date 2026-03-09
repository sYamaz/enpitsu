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

    // Deduplicate closely-spaced points for stable rendering.
    // At stroke start/end/pause, many Catmull-Rom interpolated points cluster
    // at nearly the same position, causing tangent instability.
    const MIN_STEP = 1.0  // px
    const pts: { x: number; y: number; pressure: number }[] = [
        { x: points[0].x + ox, y: points[0].y + oy, pressure: points[0].pressure }
    ]
    for (let i = 1; i < points.length; i++) {
        const prev = pts[pts.length - 1]
        const dx = points[i].x + ox - prev.x
        const dy = points[i].y + oy - prev.y
        if (dx * dx + dy * dy >= MIN_STEP * MIN_STEP) {
            pts.push({ x: points[i].x + ox, y: points[i].y + oy, pressure: points[i].pressure })
        }
    }

    // Build path as a collection of simple subpaths (circle per point + trapezoid per
    // segment), all wound in the same direction (clockwise in screen coords = positive
    // winding). With nonzero fill rule, overlapping subpaths sum to winding ±2, which
    // is still nonzero → correctly filled. A single ctx.fill() call applies alpha once
    // per pixel regardless of how many subpaths cover that pixel — no alpha accumulation.
    const path = new Path2D()

    for (const pt of pts) {
        const r = radiusFromPen(pt.pressure, pen)
        // arc(anticlockwise=false) is clockwise in screen coords (positive winding)
        path.moveTo(pt.x + r, pt.y)
        path.arc(pt.x, pt.y, r, 0, Math.PI * 2)
    }

    for (let i = 1; i < pts.length; i++) {
        const pi = pts[i - 1]
        const pj = pts[i]
        const ri = radiusFromPen(pi.pressure, pen)
        const rj = radiusFromPen(pj.pressure, pen)

        const dx = pj.x - pi.x
        const dy = pj.y - pi.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 1e-6) continue
        const nx = -dy / len
        const ny = dx / len

        // Trapezoid wound clockwise in screen coords (positive winding, consistent
        // with the circles above)
        path.moveTo(pi.x + nx * ri, pi.y + ny * ri)
        path.lineTo(pi.x - nx * ri, pi.y - ny * ri)
        path.lineTo(pj.x - nx * rj, pj.y - ny * rj)
        path.lineTo(pj.x + nx * rj, pj.y + ny * rj)
        path.closePath()
    }

    // Gradient fill along start→end axis (up to 20 color stops)
    let fillStyle: string | CanvasGradient
    const n = pts.length
    const dx = pts[n - 1].x - pts[0].x
    const dy = pts[n - 1].y - pts[0].y
    if (n === 1 || Math.sqrt(dx * dx + dy * dy) < 0.001) {
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
