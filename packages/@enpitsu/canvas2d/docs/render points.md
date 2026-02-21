# render points

stroke1点目: 

- controller: pending arrayに追加して終わり
- store
  - pending array: 1点
  - rendered array: 0点
- renderer: 何もしない

stroke2点目:

- controller: pending arrayに追加して終わり
- store
  - pending array: 2点
  - rendered array: 0点
- renderer: 何もしない

stroke3点目:

- controller: spline補間
  - pending array[0], pending array[0], pending array[1], 現在点を対象とする
  - wait render arrayにpending array[0], 補間点...を追加する。
- store
  - pending array: p1, p2
  - wait render array: p0, 補間点...
  - rendered array: 0点
- renderer: 描画する
- store（描画後）
  - pending array: p1, p2
  - wait render array: 0点
  - rendered array: p0, 補間点....

stroke4点目以降(i番目):

- controller: spline補間
  - 対象
    - rendered array[length - 1 - 補間点数]  (= pi-3)
    - pending array[0] (= pi-2)
    - pending array[1] (= pi-1)
    - 現在点 (= pi)
  - wait render arrayにpending array[0], 補間点...を追加する。
- store
  - pending array: pi-1, pi
  - wait render array: pi-2, 補間点...
  - rendered array: ..., pi-3, 補間点...
- renderer: 描画する
- store（描画後）
  - pending array: pi-1, pi
  - wait render array: 0点
  - rendered array: ..., pi-2, 補間点...

stroke最後の点(j番目完了後)

- store（描画後）
  - pending array: pj-1, pj
  - wait render array: 0点
  - rendered array: ..., pj-2, 補間点...
- controller: spline補間
  - p0: rendered array[length - 1 - 補間点数] (= pj-2)
  - p1: pj-1
  - p2: pj
  - p3: pj
- store
  - pending array: 0点
  - wait render array: pj-1, 補間点..., pj
  - rendered array: ..., pj-2, 補間点...
- store (描画後)
  - pending array: 0点
  - wait render array: 0点
  - rendered array: ..., pj-1, 補間点..., pj
  


