import React, { useEffect, useRef, useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

const RETRY_DELAY_MS = 1500

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)
  const [retryTrigger, setRetryTrigger] = useState(0)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { src, alt, style, className, ...rest } = props

  useEffect(() => {
    if (src && src.length > 0) {
      setDidError(false)
      retryCountRef.current = 0
    }
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
  }, [src])

  const handleError = () => {
    if (retryCountRef.current < 1) {
      retryCountRef.current += 1
      setDidError(true)
      retryTimeoutRef.current = setTimeout(() => {
        retryTimeoutRef.current = null
        setRetryTrigger((k) => k + 1)
        setDidError(false)
      }, RETRY_DELAY_MS)
    } else {
      setDidError(true)
    }
  }

  const hasSrc = typeof src === 'string' && src.length > 0

  if (!hasSrc) {
    return <div className={className} style={{ ...style, minHeight: style?.minHeight }} aria-hidden />
  }
  if (didError) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={src} />
        </div>
      </div>
    )
  }
  return (
    <img
      key={`${src}-${retryTrigger}`}
      src={src}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
    />
  )
}
