import { InputPoint, Pen, Point } from "types";

/**
 * 筆圧とペン設定から RGBA カラー文字列を生成する。
 *
 * 色の計算式:
 *   channel = pen.channel + (1 - pressure) * (255 - pen.channel) * (1 - minColorRatio)
 *
 * pressure=1（最大筆圧）のとき channel = pen.channel（ペン本来の色）。
 * pressure=0（無筆圧）のとき channel は白（255）に近づく。
 * minColorRatio が 1.0 に近いほど筆圧による色変化が小さくなる。
 *
 * pen.alpha が未設定の場合は 1.0（完全不透明）とみなす。
 * alpha < 1.0 のとき透明なペンになるが、後述のサブパス方式により
 * セグメント間での alpha 累積は発生しない。
 */
const colorStyleFromPen = (pressure: number, pen: Pen): string => {
    const alpha = pen.alpha ?? 1
    const r = pen.r + (1 - pressure) * ((255 - pen.r) * (1 - pen.minColorRatio))
    const g = pen.g + (1 - pressure) * ((255 - pen.g) * (1 - pen.minColorRatio))
    const b = pen.b + (1 - pressure) * ((255 - pen.b) * (1 - pen.minColorRatio))
    return `rgba(${r},${g},${b},${alpha})`
}

/**
 * 筆圧とペン設定からストローク半径（px）を計算する。
 *
 * pressure=0 → minThickness、pressure=1 → maxThickness の線形補間。
 */
const radiusFromPen = (pressure: number, pen: Pen): number => {
    return pen.minThickness + pressure * (pen.maxThickness - pen.minThickness)
}

/** buildStrokeRenderData の戻り値。呼び出し側が ctx.fill() で描画する。 */
export type StrokeRenderData = {
    path: Path2D
    fillStyle: string | CanvasGradient
}

/**
 * ストロークを1回の ctx.fill() で描画するための Path2D と fillStyle を構築する。
 *
 * ---
 * ## なぜ「複数サブパス + 1回 fill」なのか
 *
 * ### 旧実装（renderSegment + renderJoint）の問題
 * 旧実装ではセグメントごとに `ctx.fill()` を呼んでいた。
 * 隣接セグメントの端（ジョイント部）は円でオーバーラップするが、
 * alpha < 1 のペンでは「先に塗った色の上にもう一度半透明の色を重ねる」ことになり、
 * ジョイント部で alpha が累積して色が濃くなる（まだら模様）問題があった。
 *
 * ### 単一アウトライン（第1次改修）の問題
 * 全点をつなぐ1本のアウトラインを Path2D として構築し、1回だけ fill する方式を試みた。
 * しかしこのアプローチには致命的な欠陥があった:
 *
 * 1. **ゆっくり描画時のまだら（タンジェント不安定）**
 *    Catmull-Rom 補間でストロークの開始・終了・一時停止の箇所に点が密集すると、
 *    中心差分で求めるタンジェントが浮動小数点誤差に敏感になり、
 *    ごく微小な位置差から計算されたタンジェント方向が大きく振れることがある。
 *    → 各点の法線方向が不安定 → アウトラインパスが自己交差。
 *
 * 2. **パスの自己交差による白い穴（ワインディング問題）**
 *    アウトラインパスが自己交差すると、Canvas の nonzero fill rule により
 *    一部の領域でワインディング数が 0 になり塗られない（白い穴として見える）。
 *    特にストロークが曲がる箇所で内側エッジが外側エッジをまたいだとき、
 *    逆向きのワインディングが打ち消し合って「反転した白い領域」が発生していた。
 *
 * ### 現実装（複数サブパス + 1回 fill）
 * 各点に **円サブパス**、各セグメントに **台形サブパス** を追加し、
 * すべてを1つの Path2D にまとめて1回だけ `ctx.fill()` する。
 *
 * **alpha 累積しない理由**:
 *   `ctx.fill()` は Path2D 全体の「どのピクセルが塗られるか」をまず決定し、
 *   塗られると判断されたピクセルに対して fillStyle の色をキャンバスに1回だけ合成する。
 *   複数のサブパスが重なっていても、同一ピクセルへの色の適用は1回だけなので
 *   alpha が累積することはない。
 *
 * **白い穴が出ない理由（ワインディング設計）**:
 *   すべてのサブパス（円・台形）を同じ方向（スクリーン座標系で時計回り = 正のワインディング）
 *   で描くことを徹底している。
 *   重なり合う領域のワインディング数は ±2, ±3, ... と増えるが、
 *   nonzero fill rule では「0でなければ塗る」ため、重なりは常に正しく塗られる。
 *   逆向きのワインディングが混在しないのでワインディング 0 の穴は生じない。
 *
 * ---
 * ## 点のデデュープ（密集点の間引き）
 *
 * Catmull-Rom 補間は1つのポインタイベントにつき `splinePoints`（デフォルト 10）個の
 * 補間点を生成する。ゆっくり描くと生のイベント座標がほぼ同じ位置に留まり続けるため、
 * 補間後の点列が同一座標付近に数百個密集することがある。
 *
 * 密集した点は描画上まったく意味をもたないだけでなく、
 * タンジェントを不安定にしてアウトライン系アプローチで問題を起こす原因にもなっていた。
 * 本実装は MIN_STEP (1px) 未満の移動量しかない点をスキップすることで、
 * 不要な点を排除しつつ視覚的には同等の品質を保つ。
 *
 * （現在の複数サブパス方式ではタンジェントを使わないので直接の安定化効果はないが、
 *  Path2D に追加するサブパス数を抑えてパフォーマンスを向上させる効果がある。）
 *
 * @param ctx    OffscreenCanvasRenderingContext2D（グラデーション生成に使用）
 * @param points ストロークの補間済み入力点列
 * @param pen    ペン設定
 * @param offset セレクタ等による座標オフセット（省略時は (0, 0)）
 * @returns      Path2D と fillStyle のペア。points が空なら null。
 */
export const buildStrokeRenderData = (
    ctx: OffscreenCanvasRenderingContext2D,
    points: InputPoint[],
    pen: Pen,
    offset?: Point
): StrokeRenderData | null => {
    if (points.length === 0) return null

    const ox = offset?.x ?? 0
    const oy = offset?.y ?? 0

    // ── デデュープ ──────────────────────────────────────────────────────────
    // 前の保持点から MIN_STEP 未満しか離れていない点はスキップする。
    // これにより開始・終了・一時停止箇所の密集点を間引き、
    // 不必要なサブパスの生成を防ぐ。
    const MIN_STEP = 1.0  // px（隣接保持点間の最小距離）
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

    // ── Path2D 構築 ──────────────────────────────────────────────────────────
    const path = new Path2D()

    // 各点に円サブパスを追加する。
    // arc(anticlockwise=false) はスクリーン座標系で時計回りに描かれる。
    // Canvas の nonzero fill rule における「正のワインディング方向」であり、
    // 下で追加する台形サブパスの向きと一致させることが重要。
    for (const pt of pts) {
        const r = radiusFromPen(pt.pressure, pen)
        path.moveTo(pt.x + r, pt.y)  // arc の開始点（angle=0）に明示的に moveTo してサブパスを開始
        path.arc(pt.x, pt.y, r, 0, Math.PI * 2)
    }

    // 隣接する2点間に台形サブパスを追加する。
    // 台形はセグメントの法線方向に各点の半径分だけ広げた四角形で、
    // 断面が変化する（太さが変わる）ストロークを表現する。
    //
    // 頂点の順序について:
    //   pi + normal*ri → pi - normal*ri → pj - normal*rj → pj + normal*rj
    //   （法線正側→法線負側→終点法線負側→終点法線正側）
    //
    // この順序はスクリーン座標系（y 下向き）で時計回りになる。
    // ショールース公式による符号付き面積が正（>0）＝時計回り＝正のワインディング。
    // 円サブパスと向きを揃えることで、重なり領域のワインディングが
    // +2, +3, ... と正のまま増加し、nonzero fill rule で常に塗られる。
    for (let i = 1; i < pts.length; i++) {
        const pi = pts[i - 1]
        const pj = pts[i]
        const ri = radiusFromPen(pi.pressure, pen)
        const rj = radiusFromPen(pj.pressure, pen)

        const dx = pj.x - pi.x
        const dy = pj.y - pi.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 1e-6) continue  // デデュープ後でもゼロ長が残る場合はスキップ

        // セグメント方向に対して左90°の単位法線ベクトル
        // (dx, dy) の左90°回転は (-dy, dx) → 単位化して (nx, ny)
        const nx = -dy / len
        const ny = dx / len

        path.moveTo(pi.x + nx * ri, pi.y + ny * ri)
        path.lineTo(pi.x - nx * ri, pi.y - ny * ri)
        path.lineTo(pj.x - nx * rj, pj.y - ny * rj)
        path.lineTo(pj.x + nx * rj, pj.y + ny * rj)
        path.closePath()
    }

    // ── fillStyle（グラデーション）構築 ──────────────────────────────────────
    // ストロークの始点→終点を軸とした線形グラデーションで筆圧変化による色変化を近似する。
    //
    // 最大 20 点のカラーストップをインデックスで等間隔にサンプリングして追加する。
    // 完全な弧長パラメータ化は行わないため、曲率の大きいストロークでは
    // グラデーション位置と実際の筆圧分布がずれる場合があるが、
    // Catmull-Rom 補間済みの密な点列では視覚的に許容範囲に収まる。
    //
    // 退化ケース（点が1つ、または始点と終点がほぼ同じ位置）では
    // グラデーション軸がゼロになるため、中間点の色で単色 fill する。
    let fillStyle: string | CanvasGradient
    const n = pts.length
    const dx = pts[n - 1].x - pts[0].x
    const dy = pts[n - 1].y - pts[0].y
    if (n === 1 || Math.sqrt(dx * dx + dy * dy) < 0.001) {
        // 退化ケース: 単色 fill
        fillStyle = colorStyleFromPen(pts[Math.floor(n / 2)].pressure, pen)
    } else {
        const gradient = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[n - 1].x, pts[n - 1].y)
        const stopCount = Math.min(n, 20)
        for (let s = 0; s < stopCount; s++) {
            const idx = Math.round(s * (n - 1) / (stopCount - 1))
            const t = s / (stopCount - 1)  // グラデーション軸上の位置 [0, 1]
            gradient.addColorStop(t, colorStyleFromPen(pts[idx].pressure, pen))
        }
        fillStyle = gradient
    }

    return { path, fillStyle }
}
