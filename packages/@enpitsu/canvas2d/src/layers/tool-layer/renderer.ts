import { Tool } from "types";

export const useToolLayerRenderer = (
    canvas: HTMLCanvasElement, 
) => {
    
    const offscreen = canvas.transferControlToOffscreen()
    const ctx = offscreen.getContext('2d')!
    let tool: Tool | null = null

    const _render = (ctx: OffscreenCanvasRenderingContext2D) => {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, offscreen.width, offscreen.height)
        if(tool) {
            tool.render(ctx)
        }
    }

    return {
        clear: () => {
            ctx.clearRect(0, 0, offscreen.width, offscreen.height)
        },
        setTool: (_tool: Tool) => {
            tool = _tool
        },
        render: () => {
            _render(ctx)
        },
        requestRender: (rendered?: () => void) => {
            requestAnimationFrame(() => {
                _render(ctx)
                rendered?.()
            })
        }
    }
}