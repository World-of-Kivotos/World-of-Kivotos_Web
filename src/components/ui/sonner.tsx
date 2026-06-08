import { useEffect, useState } from 'react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * Toaster: 跟随 <html class="dark"> 切换主题。
 * 通过 MutationObserver 监听根元素 class 变化, 避免依赖额外的主题 context。
 */
function Toaster(props: ToasterProps) {
  const [theme, setTheme] = useState<ToasterProps['theme']>(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="top-right"
      richColors
      closeButton
      {...props}
    />
  )
}

export { Toaster }
