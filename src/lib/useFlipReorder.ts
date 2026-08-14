import { useCallback, useLayoutEffect, useRef } from 'react'

/** 卡片换位的时长与缓动。缓动尾部很长, 卡片滑到位时几乎是贴上去的, 不会"啪"地停住。 */
const DURATION_MS = 520
const EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'

/** 位移小于这个值就不动画: 亚像素抖动触发的动画只会让画面发毛。 */
const MIN_DELTA_PX = 0.5

/** 标记本 hook 创建的动画, 免得误伤元素自己的入场动画。 */
const FLIP_ID = 'flip-reorder'

/**
 * 让列表重排时卡片滑动到新位置, 而不是瞬间跳过去。
 *
 * 用的是 FLIP: 重排后 DOM 已经在新位置了, 先用 transform 把它按回旧位置, 再动画回零。
 * 位移走 transform 而不是改 top/margin —— 后者每帧都要重新布局, 七张卡片同时动会掉帧,
 * 而 transform 只在合成阶段处理。
 *
 * 位置取 offsetTop 而非 getBoundingClientRect().top: 后者相对视口, 用户在重排的同时滚动
 * 页面就会把滚动距离一并算进位移, 卡片会朝反方向飞出去。
 */
export function useFlipReorder(order: readonly string[], duration = DURATION_MS) {
  const nodes = useRef(new Map<string, HTMLElement>())
  const previousTop = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    // 先把上一轮还没跑完的位移动画取消掉再量位置。动画进行中 transform 非零,
    // 此时量出来的是"半路上"的视觉位置, 拿它当基准会让下一段动画从错误的地方起跳。
    nodes.current.forEach((element) => {
      element
        .getAnimations()
        .filter((animation) => animation.id === FLIP_ID)
        .forEach((animation) => animation.cancel())
    })

    nodes.current.forEach((element, key) => {
      const top = element.offsetTop
      const before = previousTop.current.get(key)
      previousTop.current.set(key, top)

      if (before === undefined || Math.abs(before - top) < MIN_DELTA_PX) return

      const animation = element.animate(
        [{ transform: `translateY(${before - top}px)` }, { transform: 'translateY(0)' }],
        { duration, easing: EASING }
      )
      animation.id = FLIP_ID
    })
  }, [order, duration])

  /** 挂到每张卡片的 ref 上。卸载时传 null, 顺手清掉记录, 免得 id 复用时拿到上一轮的位置。 */
  return useCallback((key: string) => (element: HTMLElement | null) => {
    if (element) {
      nodes.current.set(key, element)
    } else {
      nodes.current.delete(key)
      previousTop.current.delete(key)
    }
  }, [])
}
