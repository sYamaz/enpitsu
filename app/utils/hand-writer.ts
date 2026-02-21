import { getNormal } from "./vector";

export interface InputPoint extends Point {
    pressure: number;
}

export interface Point {
    x: number;
    y: number;
}

export interface Joint extends Point {
    size: number;
    alpha: number;
    darkness: number;
}

export interface Segment {
    start: Joint
    end: Joint
    normX: number
    normY: number
    start1: Point
    end1: Point
    start2: Point
    end2: Point
}

export const useHandWriter = (minThickness = 1, maxThickness = 10, minAlpha = 0.5, maxAlpha = 1.0, minDarkness = 128, maxDarkness = 255) => {
    const grad = Math.abs(maxThickness - minThickness);
    // minThickness, maxThicknessをもとにpressure(0~1)を線の太さに変換する関数を返す
    const pressureToThickness = (pressure: number): number => {
        return minThickness + grad * pressure;
    }

    const alphaGrad = Math.abs(maxAlpha - minAlpha)
    const pressureToAlpha = (pressure: number) => {
        const alpha = minAlpha + alphaGrad * pressure
        if(alpha > 1) {
            return 1
        }
        if(alpha < 0) {
            return 0
        }
        return alpha
    }

    const darknessGrad = Math.abs(maxDarkness - minDarkness)
    const pressureToDarkeness = (pressure: number) => {
        const darkness = minDarkness + darknessGrad * pressure
        if(darkness > 255) {
            return 255
        }
        if(darkness < 0) {
            return 0
        }
        return darkness
    }

    const convertToJoint = (point: InputPoint): Joint => {
        return {
            x: point.x,
            y: point.y,
            size: pressureToThickness(point.pressure),
            alpha: pressureToAlpha(point.pressure),
            darkness: pressureToDarkeness(point.pressure)
        }
    }

    return {
        getPressureToThickness: pressureToThickness,
        convertToJoint: convertToJoint,
        getSegment: (prev: InputPoint, current: InputPoint): Segment => {
            // ２点間に直行するベクトルを求める
            const {x, y} = getNormal(prev, current);
            const startJoint: Joint = convertToJoint(prev);
            const endJoint: Joint = convertToJoint(current);

            return {
                start: startJoint,
                end: endJoint,
                start1: {x: startJoint.x + x * startJoint.size, y: startJoint.y + y * startJoint.size},
                end1: {x: endJoint.x + x * endJoint.size, y: endJoint.y + y * endJoint.size},
                start2: {x: startJoint.x - x * startJoint.size, y: startJoint.y - y * startJoint.size},
                end2: {x: endJoint.x - x * endJoint.size, y: endJoint.y - y * endJoint.size},
                normX: x,
                normY: y
            };
        },
    }
}