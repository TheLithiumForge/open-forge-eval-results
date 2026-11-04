import { useCallback, useEffect, useRef, useState } from 'react'

export function useAnnouncements(): { message: string; announce: (text: string) => void; clear: () => void } {
  const [message, setMessage] = useState('')
  const queue = useRef<string[]>([])
  const timer = useRef<number | null>(null)

  const showNext = useCallback((): void => {
    const next = queue.current.shift()
    if (next === undefined) { timer.current = null; return }
    setMessage('')
    timer.current = window.setTimeout(() => {
      setMessage(next)
      timer.current = window.setTimeout(() => {
        if (queue.current.length === 0) { timer.current = null; return }
        setMessage('')
        timer.current = window.setTimeout(showNext, 40)
      }, 150)
    }, 40)
  }, [])

  const announce = useCallback((text: string) => {
    queue.current.push(text)
    if (timer.current === null) showNext()
  }, [showNext])

  const clear = useCallback((): void => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    queue.current = []
    setMessage('')
  }, [])

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
  }, [])

  return { message, announce, clear }
}
