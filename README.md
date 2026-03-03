# enpitsu

Apple Pencil / タッチ対応の手描きキャンバスアプリ。
Nuxt 4 フロントエンドと、独自実装の Canvas 描画エンジン (`canvas2d`) で構成されるモノレポ。

## リポジトリ構成

```
enpitsu/
├── app/                          # Nuxt 4 / Vue 3 フロントエンド
│   ├── pages/
│   │   ├── enpitsu.vue           # メイン描画ページ (/enpitsu)
│   │   └── segment.vue           # セグメント描画テストページ
│   ├── components/               # UI コンポーネント
│   └── composables/useGesture.ts # ジェスチャーハンドラ（予約）
└── packages/@enpitsu/canvas2d/   # 描画エンジンライブラリ
    └── src/
        ├── enpitsu.ts            # エントリポイント (useEnpitsu)
        ├── types.ts              # 共有型定義
        ├── transformer/          # ビューポート変換 (DPR・ズーム・パン)
        ├── store/                # ストローク履歴管理
        ├── renderer/             # 低レベル描画プリミティブ
        └── layers/
            ├── tool-layer/       # 入力中ストロークの描画・ツール管理
            └── combined-layer/   # 確定済みストロークの描画
```

## セットアップ

```bash
npm install
```

## 開発

```bash
# Nuxt 開発サーバー起動 (http://0.0.0.0:3000)
npm run dev

# canvas2d パッケージのビルド（ソース変更後に必要）
cd packages/@enpitsu/canvas2d
npm run build
```

> `canvas2d` パッケージの変更は `npm run build` でコンパイルしないと Nuxt に反映されない（`dist/` からインポートするため）。

## ビルド・プレビュー

```bash
npm run build    # プロダクションビルド
npm run generate # 静的サイト生成
npm run preview  # プロダクションビルドのプレビュー
```

## 主な機能

| 機能 | 内容 |
|---|---|
| ペン描画 | Catmull-Rom スプライン補間による滑らかな筆跡 |
| 消しゴム | ピクセル単位の消去 |
| ストローク削除 | ストローク単位での削除 |
| セレクター | ラッソ選択 + ドラッグによるストローク移動 |
| パン | 2本指スワイプ（wheel イベント） |
| ズーム | ピンチイン・アウト / Ctrl+スクロール（wheel イベント） |
| パームリジェクション | ペン使用中は指入力を無視 |

## アーキテクチャ概要

### 2 レイヤー Canvas システム

| レイヤー | 用途 |
|---|---|
| `toolCanvas`（前面） | 入力中のストローク描画・ポインターイベント受付 |
| `combinedCanvas`（背面） | 確定済みストローク全体の描画 |

両 Canvas とも `transferControlToOffscreen()` で OffscreenCanvas に移譲し、メインスレッドをブロックしない。

### ストロークのデータフロー

```
PointerEvent
  → useEnpitsu (enpitsu.ts)
  → toolLayer.onPointer*
  → BasicTool（ビューポート座標 → ローカル座標変換）
  → PenTool._addPoint（Catmull-Rom 補間）
  → StrokeStore.pushStrokes（pointerup 時に確定）
  → combinedLayer.requestRender（全確定ストロークを再描画）
```

### ビューポート変換

`ViewportTransformer` が DPR・ズーム・パンを管理する。
描画用行列（DPR 込み）とコントローラー用行列（DPR なし）の 2 種類を提供し、座標の逆変換はその逆行列で行う。
