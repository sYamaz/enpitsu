import { InputPoint, Pen, Point } from "types";

/**
 * ２点間の法線ベクトルを求める
 * @param pi 
 * @param pj 
 * @returns 
 */
const getNormal = (pi: Point, pj: Point): { x: number, y: number } => {
    const dx = pj.x - pi.x;
    const dy = pj.y - pi.y;
    const invLen = 1 / Math.sqrt(dx * dx + dy * dy);

    return {
        x: -dy * invLen,
        y: dx * invLen
    };
}

const colorStyleFromPen = (pressure: number, pen: Pen) => {
    const ratio = pen.minColorRatio + pressure * (pen.maxColorRatio - pen.minColorRatio)

    const r = pen.r * ratio
    const g = pen.g * ratio
    const b = pen.b * ratio

    return `rgba(${r},${g},${b},1)`
}

const radiusFromPen = (pressure: number, pen: Pen) => {
    const radius = pen.minThickness + pressure * (pen.maxThickness - pen.minThickness)
    return radius
}

export const renderSegment = (ctx: OffscreenCanvasRenderingContext2D, pi: InputPoint, pj: InputPoint, pen: Pen) => {
    const gradient = ctx.createLinearGradient(pi.x, pi.y, pj.x, pj.y)
    gradient.addColorStop(0, colorStyleFromPen(pi.pressure, pen))
    gradient.addColorStop(1, colorStyleFromPen(pj.pressure, pen))
    ctx.fillStyle = gradient
    ctx.lineWidth = 0

    // segment(台形)の描画
    const normal = getNormal(pi, pj)
    const pi_radius = radiusFromPen(pi.pressure, pen)
    const pj_radius = radiusFromPen(pj.pressure, pen)
    ctx.beginPath()
    ctx.moveTo(pi.x + normal.x * pi_radius, pi.y + normal.y * pi_radius)
    ctx.lineTo(pi.x - normal.x * pi_radius, pi.y - normal.y * pi_radius)
    ctx.lineTo(pj.x - normal.x * pj_radius, pj.y - normal.y * pj_radius)
    ctx.lineTo(pj.x + normal.x * pj_radius, pj.y + normal.y * pj_radius)
    ctx.closePath()

    ctx.fill()
}


export const renderJoint = (ctx: OffscreenCanvasRenderingContext2D, p: InputPoint, pen: Pen) => {

    ctx.fillStyle = colorStyleFromPen(p.pressure, pen)
    ctx.lineWidth = 0
    ctx.beginPath()
    ctx.arc(p.x, p.y, radiusFromPen(p.pressure, pen) - 0.5, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fill()

}