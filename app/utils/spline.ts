import {BasicCatmullRomSpline} from '@syamaz/catmull-rom-spline'
import type {InputPoint} from './hand-writer'

export class Spline extends BasicCatmullRomSpline<InputPoint> {
    protected override calcDistance(pi: InputPoint, pj: InputPoint): number {
        const dx = pi.x - pj.x
        const dy = pi.y - pj.y
        return Math.sqrt(dx * dx + dy * dy)
    }
    protected override magnify(p: InputPoint, mul: number): InputPoint {
        return {
            x: p.x * mul,
            y: p.y * mul,
            pressure: p.pressure * mul
        }
    }
    protected override sum(pi: InputPoint, pj: InputPoint): InputPoint {
        return {
            x: pi.x + pj.x,
            y: pi.y + pj.y,
            pressure: pi.pressure + pj.pressure
        }
    }
}
