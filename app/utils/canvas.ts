import {getNormal} from './vector';

const PRESSURE_MULTIPLIER = 20;
const CAP_COLOR = "black";
const CAP_STROKE_WIDTH = 0.5;
const LINE_COLOR = "red";
const LINE_STROKE_WIDTH = 1;

export interface InputPoint extends Point {
    pressure: number;
}

export interface Point {
    x: number;
    y: number;
}

/**
 * 始点のキャップを描画する
 * @param ctx 
 * @param point 
 */
export const drawCap = (ctx: CanvasRenderingContext2D, point: InputPoint) => {
    ctx.strokeStyle = CAP_COLOR;
    ctx.lineWidth = CAP_STROKE_WIDTH;
    const size = point.pressure * PRESSURE_MULTIPLIER;
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, size, size, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.closePath();
}

export const getSegmentPoints = (prev: InputPoint, current: InputPoint): {start1: Point, end1: Point, start2: Point, end2: Point} => {
    const currentSize = current.pressure * PRESSURE_MULTIPLIER;
    const prevSize = prev.pressure * PRESSURE_MULTIPLIER;

    // ２点間に直行するベクトルを求める
    const {x, y} = getNormal(prev, current);

    return {
        start1: {x: prev.x + x * prevSize, y: prev.y + y * prevSize},
        end1: {x: current.x + x * currentSize, y: current.y + y * currentSize},
        start2: {x: prev.x - x * prevSize, y: prev.y - y * prevSize},
        end2: {x: current.x - x * currentSize, y: current.y - y * currentSize}
    };
}

/**
 * リアルタイムに２点間を結ぶ線を描画する。
 * カプセル型になるように描画する。
 * @param ctx 
 * @param prev 
 * @param current 
 */
export const drawSegment = (ctx: CanvasRenderingContext2D, prev: InputPoint, current: InputPoint) => {
    const currentSize = current.pressure * PRESSURE_MULTIPLIER;

    const ps = getSegmentPoints(prev, current);

    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = LINE_STROKE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(ps.start1.x, ps.start1.y);
    ctx.lineTo(ps.end1.x, ps.end1.y);
    ctx.lineTo(ps.end2.x, ps.end2.y);
    ctx.lineTo(ps.start2.x, ps.start2.y);
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.ellipse(current.x, current.y, currentSize, currentSize, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.closePath();
}


/**
 * Round Joinのパスを取得する。
 * 注意：取得される座標はp1-p2のセグメントに関する座標と、ラウンドジョインの補完点のみである
 * @param p1 
 * @param p2 
 * @param p3 
 * @param steps 円弧の分割数
 */
const getRoundJoinPath = (p1: InputPoint, p2: InputPoint, p3: InputPoint, steps = 5): { right:Point[], left:Point[]} => {
  const prevNormal = getNormal(p1, p2);
  const nextNormal = getNormal(p2, p3);
  
  // 2つの法線間を円弧で補間
  const angle1 = Math.atan2(prevNormal.y, prevNormal.x);
  const angle2 = Math.atan2(nextNormal.y, nextNormal.x);
  
  const rightPoints: {x: number, y: number}[] = [];
  const leftPoints: {x: number, y: number}[] = [];

  const segment12 = getSegmentPoints(p1, p2);
  
  // 前のセグメントの外側の点から開始
  rightPoints.push({
    x: segment12.start1.x,
    y: segment12.start1.y
  }, {
    x: segment12.end1.x,
    y: segment12.end1.y
  });

  leftPoints.push({
    x: segment12.start2.x,
    y: segment12.start2.y
  },{
    x: segment12.end2.x,
    y: segment12.end2.y
  })

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = angle1 + (angle2 - angle1) * t;
    rightPoints.push({
      x: p2.x + Math.cos(angle) * p2.pressure * PRESSURE_MULTIPLIER,
      y: p2.y + Math.sin(angle) * p2.pressure * PRESSURE_MULTIPLIER
    });

    leftPoints.push({
      x: p2.x - Math.cos(angle) * p2.pressure * PRESSURE_MULTIPLIER,
      y: p2.y - Math.sin(angle) * p2.pressure * PRESSURE_MULTIPLIER
    });
  }

  return { right: rightPoints, left: leftPoints };
}

/**
 * i-2、i-1のセグメントと、i-1、iのセグメントを使用しラウンドジョイン計算を行描画をする。
 * 次はi-1、iのセグメントと、i、i+1のセグメントについて行う、といったようにセグメントずつ計算を進めていく。
 * そのため、ラウンドジョイン前のセグメントとラウンドジョインの補間点はそのループ内で確定するが、ラウンドジョイン補間後のセグメントの確定は次回に持ち越す。
 * @param ctx 
 * @param points 
 * @returns 
 */
export const drawRoundJoinedLines = (ctx: CanvasRenderingContext2D, points: InputPoint[]) => {
    if (points.length < 3) {
        return;
    }

    const leftPoints: Point[] = [];
    const rightPoints: Point[] = [];

    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = LINE_STROKE_WIDTH;
    ctx.beginPath();

    for (let i = 2; i < points.length; i++) {
        const p1 = points[i - 2]!;
        const p2 = points[i - 1]!;
        const p3 = points[i]!;

        const { right, left } = getRoundJoinPath(p1, p2, p3);

        // 取得した点は最初のセグメントとラウンドジョインの補間点までなのでそのまま配列に追加する
        rightPoints.push(...right);
        leftPoints.push(...left);
    }

    // pointsのうち、最後のセグメントについてrightPointsとleftPointsに追加する
    const lastIndex = points.length - 1;
    const lastSegment = getSegmentPoints(points[lastIndex - 1]!, points[lastIndex]!);
    rightPoints.push(lastSegment.start1, lastSegment.end1);
    leftPoints.push(lastSegment.start2, lastSegment.end2);

    // 右側の点をたどる
    ctx.moveTo(rightPoints[0]!.x, rightPoints[0]!.y);
    for (const pt of rightPoints) {
        ctx.lineTo(pt.x, pt.y);
    }

    // 左側の点をたどる（逆順）
    for (let i = leftPoints.length - 1; i >= 0; i--) {
        const pt = leftPoints[i]!;
        ctx.lineTo(pt.x, pt.y);
    }

    ctx.closePath();
    ctx.stroke();
}