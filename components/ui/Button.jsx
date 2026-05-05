// components/ui/Button.jsx
'use client'

import { forwardRef } from 'react'

const VARIANTS = {
  primary:   'bg-purple-600 hover:bg-purple-700 text-white shadow-sm hover:shadow-md',
  secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm',
  danger:    'bg-red-500 hover:bg-red-600 text-white shadow-sm',
  ghost:     'bg-transparent hover:bg-gray-100 text-gray-600',
  outline:   'bg-transparent border-2 border-purple-600 text-purple-600 hover:bg-purple-50',
}

const SIZES = {
  sm:   'px-3 py-1.5 text-sm rounded-lg',
  md:   'px-4 py-2 text-sm rounded-xl',
  lg:   'px-6 py-3 text-base rounded-xl',
  icon: 'p-2 rounded-xl',
}

const Button = forwardRef(function Button(
  {
    children,
    variant  = 'primary',
    size     = 'md',
    loading  = false,
    disabled = false,
    className = '',
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center gap-2
        font-medium transition-all duration-200 cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANTS[variant]}
        ${SIZES[size]}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4 flex-shrink-0"
          fill="none" viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25" cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"
          />
          <path
            className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
})

export default Button