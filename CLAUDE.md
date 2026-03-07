# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Nuxt App (root)
```bash
npm run dev       # Start dev server on http://0.0.0.0:3000
npm run build     # Build for production
npm run generate  # Static site generation
npm run preview   # Preview production build
```

### canvas2d Package (`packages/@enpitsu/canvas2d/`)
```bash
npm run build     # Compile to dist/ via tsc (required after changes, before Nuxt picks them up)
npm run dev       # Vite dev server for the package itself
```

After editing the canvas2d package, rebuild it with `npm run build` inside that directory so the Nuxt app picks up the changes (it imports from `dist/`).

There are no tests configured in this project.

## Architecture

This monorepo has two parts:

- **`app/`** — Nuxt 4 / Vue 3 frontend
- **`packages/@enpitsu/canvas2d/`** — Local TypeScript drawing engine library, referenced as `"canvas2d": "file:packages/@enpitsu/canvas2d"` in root `package.json`

### Nuxt App (`app/`)

- **`pages/enpitsu.vue`** — Main drawing demo. Mounts two stacked `<canvas>` elements, initializes `useEnpitsu()` from the canvas2d library, and wires up tool buttons.
- **`pages/segment.vue`** — Low-level segment rendering test page.
- **`components/`** — `tool-btn.vue`, `tool-header.vue`, `tool-numeri-updown.vue` (UI controls).
- **`composables/useGesture.ts`** — Touch event handler (currently stubbed, reserved for pan/zoom gestures).
- **`assets/scss/`** — Global SCSS; `_color.scss` is auto-imported into all SCSS via `nuxt.config.ts`.

### canvas2d Library (`packages/@enpitsu/canvas2d/src/`)

The library's `baseUrl` is `src/`, so internal imports use bare module names like `import { Stroke } from 'types'` resolving to `src/types.ts`.

**Entry point:** `useEnpitsu(toolCanvas, combinedCanvas): Enpitsu`

#### Two-Layer Canvas System

The drawing surface uses two stacked `<canvas>` elements:

| Layer | Z-index | Purpose |
|---|---|---|
| `toolCanvas` | 2 (front) | Active in-progress stroke; transparent background; receives pointer events |
| `combinedCanvas` | 1 (back) | All confirmed strokes rendered from `StrokeStore` |

Both canvases call `transferControlToOffscreen()`, so all rendering uses `OffscreenCanvasRenderingContext2D`.

#### Core Modules

- **`types.ts`** — All shared interfaces: `Point`, `InputPoint`, `Stroke`, `CurrentStroke`, `Pen`, `Segment`, `Joint`, `Tool`, `Enpitsu`, `ToolConfigureStructure`.
- **`store/stroke-store.ts`** — `StrokeStore`: holds confirmed stroke history, tracks `needClear` flag to trigger full redraw when strokes are modified (e.g. by Selector tool).
- **`transformer/viewport-transformer.ts`** — `ViewportTransformer`: manages DPR, zoom, and pan. Provides two matrices: `getTransformForRender()` (includes DPR) for canvas context, `getTransformForController()` (no DPR) for coordinate inversion in tools.
- **`renderer/segment.ts`** — Low-level primitives: `renderSegment()` draws a trapezoid between two points with a pressure-based gradient; `renderJoint()` draws a filled circle at a point.

#### Tool Layer (`layers/tool-layer/`)

- **`layer.ts`** (`useToolLayer`) — Manages the active tool and renders it on each animation frame. Throttles `onPointerMove` to one render per `requestAnimationFrame`.
- **`renderer.ts`** (`useToolLayerRenderer`) — Wraps the offscreen canvas context; clears and re-renders the active tool's state.
- **`tools/_basic.ts`** (`BasicTool`) — Abstract base class. Converts viewport pointer coordinates to raw canvas coordinates via the inverse of `ViewportTransformer.getTransformForController()`. Subclasses implement `_onPointerDown`, `_onPointerMove`, `_onPointerUp`, `_render`.
- **`tools/pen.ts`** (`PenTool`) — Draws strokes using Catmull-Rom spline interpolation (`@syamaz/catmull-rom-spline`). Accumulates raw points in a buffer, interpolates between them, and flushes to `StrokeStore` on `pointerup`.
- **`tools/selector.ts`** (`SelectorTool`) — Lasso selection. On `pointerup`, uses ray-casting and line-segment intersection to find strokes inside the selection polygon. Drag inside the selection bounding box moves selected strokes by updating their `offset` property and calling `StrokeStore.updateConfirmedStrokes()`.
- **`tools/eraser.ts`** / **`tools/remover.ts`** — Erase by pixel / remove whole strokes.

#### Combined Layer (`layers/combined-layer/`)

- **`renderer.ts`** (`useCombinedLayerRenderer`) — On each render, checks `StrokeStore.needClear`; if true, clears the canvas and re-renders all strokes. Otherwise, only renders strokes with `needRender: true` (incremental). Strokes have an optional `offset` field that is applied during rendering (used by the selector tool to move strokes without mutating their points).

#### Stroke Data Flow

```
PointerEvent → useEnpitsu → toolLayer.onPointer*
                           ↓
                    BasicTool (coordinate convert)
                           ↓
                    PenTool._addPoint (Catmull-Rom interpolation)
                           ↓
                    StrokeStore.pushStrokes (on pointerup)
                           ↓
                    combinedLayer.requestRender → renderSegment/renderJoint
```

## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## GitHub Operations

- Use the `gh` CLI for all GitHub operations (PRs, issues, releases, etc.)

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
