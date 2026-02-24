export const useGesture = (ele: HTMLElement) => {
    
    const onTouchStart = (ev: TouchEvent) => {
    }

    const onTouchMove = (ev: TouchEvent) => {
    }

    const onTouchEnd = (ev: TouchEvent) => {
    }

    const onTouchCancel = (ev: TouchEvent) => {
    }

    ele.addEventListener('touchstart', onTouchStart, { passive: false })
    ele.addEventListener('touchmove', onTouchMove, { passive: false })
    ele.addEventListener('touchend', onTouchEnd, { passive: false })
    ele.addEventListener('touchcancel', onTouchCancel, { passive: false })

    return {
        detatch: () => {
            ele.removeEventListener('touchstart', onTouchStart)
            ele.removeEventListener('touchmove', onTouchMove)
            ele.removeEventListener('touchend', onTouchEnd)
            ele.removeEventListener('touchcancel', onTouchCancel)
        }
    }
}