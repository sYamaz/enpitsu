# 交差判定ロジック

消しゴム・リムーバー・セレクタの各ツールが使う幾何計算をまとめる。

## 1. 概要

| ツール | 判定対象 | アルゴリズム | 結果 |
|---|---|---|---|
| EraserTool | ストロークの各線分 vs 消しゴム円 | 媒介変数 + 二次方程式（判別式） | ストロークを円で切断し、複数断片に分割 |
| RemoverTool | ストロークの各線分 vs 消しゴム円 | セグメント上への正射影で最近傍点を算出 | ストローク全体を削除 |
| SelectorTool | ストロークの点/辺 vs ラッソポリゴン | Ray Casting + 線分交差（媒介変数） | ストロークを選択済みリストへ振り分け |

---

## 2. BBox 事前フィルタ (EraserTool / RemoverTool)

高コストな点単位の計算を省くため、まず Axis-Aligned Bounding Box (AABB) で消しゴム円とストロークが重なりうるかをチェックする。

```
消しゴム円の軸平行外接正方形: [cx - r, cx + r] × [cy - r, cy + r]
ストロークの bbox:             [left, right] × [top, bottom]

重なりなし ⟺
    bbox.right  < cx - r  (ストロークが左側)
    bbox.left   > cx + r  (ストロークが右側)
    bbox.bottom < cy - r  (ストロークが上側)
    bbox.top    > cy + r  (ストロークが下側)
```

上記のいずれかが成立すれば交差不可と判断し、そのストロークへの詳細計算をスキップする。

---

## 3. EraserTool — 円とセグメントの交差点計算 (`eraser.ts`)

### 3a. `getSegmentCircleIntersections(p1, p2, center, radius)`

線分 p1→p2 と円（center, radius）の交差点を求める。媒介変数表示で直線を表し、円の方程式に代入して二次方程式を解く。

```
d = p2 - p1                       (方向ベクトル)
f = p1 - center                   (p1 から円中心へのオフセット)

a = dx² + dy²                     (|d|²)
b = 2(fx·dx + fy·dy)
c = fx² + fy² - r²

判別式 D = b² - 4ac
  D < 0 → 交差なし
  D ≥ 0 → t = (-b ± √D) / 2a

t ∈ [0, 1] の解のみ採用（線分の端点間に限定）

交差点の座標:   (p1.x + t·dx,  p1.y + t·dy)
交差点の筆圧:   p1.pressure + t·(p2.pressure - p1.pressure)  (線形補間)
```

p1 === p2（長さゼロの線分）の場合は、p1 が円内にあるかどうかだけ判定する。

### 3b. `splitStrokeByEraser(stroke, center, radius)`

`getSegmentCircleIntersections` を利用してストロークを消しゴム円で切断し、円の外側の断片だけを残す。

```
状態変数: currentPoints（現在構築中の断片）

各点 pi について:
  pi が円の外側  → currentPoints に追加
  pi が円の内側  → スキップ（交差フラグを立てる）

隣接点 pj が存在すれば、pi→pj 間の交差点を計算し t 昇順に処理:
  pi が内側 かつ 交差点が "出口"
    → currentPoints = [交差点]  (新断片の開始)
  pi が外側 かつ 交差点が "入口"
    → currentPoints に交差点を追加して断片を確定
      currentPoints = []

交差が一度もなければ元のストロークをそのまま返す。
最後に currentPoints.length ≥ 2 であれば残りの断片として追加。
```

結果として元の 1 本のストロークが 0 本以上の断片に分割される。

---

## 4. RemoverTool — 最近傍点による距離判定 (`remover.ts`)

### `segmentIntersectsCircle(p1, p2, center, radius)`

円の中心 center から線分 p1→p2 への最近傍点を正射影で求め、その距離が半径以下か判定する。

```
d = p2 - p1

t = clamp( dot(center - p1, d) / |d|² , 0, 1 )

nearest = p1 + t · d

dist(nearest, center) ≤ radius  →  交差あり
```

BBox フィルタを通過したストロークの全セグメントをこの関数で判定し、一つでも交差すればストローク全体を削除する（分割はしない点が EraserTool と異なる）。

---

## 5. SelectorTool — ラッソ選択の包含判定 (`selector.ts`)

### 5a. `isPointInPolygon(point, polygon)` — Ray Casting 法

点 point からポリゴン外側に向けて水平レイ（右方向）を飛ばし、ポリゴンの辺と何回交差するかを数える。奇数回なら内側、偶数回なら外側。

```
for 各辺 (polygon[j], polygon[i]):
  y 座標が点を挟む条件:
    (yi > point.y) !== (yj > point.y)
  x 交点が点の右側にある条件:
    point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi
  両条件を満たせば inside を反転

inside が true なら内側
```

### 5b. `segmentsIntersect(p1, p2, p3, p4)` — 媒介変数による線分交差

2 本の線分を媒介変数で表し、双方のパラメータが [0, 1] 内にある場合に交差と判定する。

```
d1 = p2 - p1,  d2 = p4 - p3

denom = dx1·dy2 - dy1·dx2      (外積; 0 なら平行)
if denom == 0  →  false

t = ((p3 - p1) × d2) / denom
u = ((p3 - p1) × d1) / denom

t ∈ [0,1] かつ u ∈ [0,1]  →  交差あり
```

### 5c. `getSelection` — 選択判定フロー

```
各ストローク stroke に対して:

1. stroke の任意の点がポリゴン内にある
       → selectedStrokes に追加

2. それ以外で、stroke の任意の辺がポリゴンの任意の辺と交差する
       → selectedStrokes に追加

3. どちらも false
       → unselectedStrokes に追加
```

選択が確定したら selectedStrokes の全点座標から selectedBBox（選択ハンドルの描画用）を再計算する。

### 5d. ドラッグ移動と offset の bake-in

ドラッグ中は選択ストロークの元の点座標を変更せず、`offset: {x, y}` を累積する。combined layer のレンダラーは描画時にこの offset を適用する。

`pointerup` でドラッグが終了すると offset を点座標に焼き込み（bake-in）、`offset` と `bbox` をリセットする。これにより他のツールが offset を意識せずにストロークを扱える。

```typescript
committed = selectedStrokes.map(s => ({
    ...s,
    points: s.points.map(p => ({
        ...p,
        x: p.x + (s.offset?.x ?? 0),
        y: p.y + (s.offset?.y ?? 0),
    })),
    offset: undefined,
    bbox: undefined,
}))
```
