import React from 'react'

function LayoutSelector({ layout, onLayoutChange }) {
  const layouts = [
    { value: '1x1', label: '1 Video' },
    { value: '2x2', label: '4 Videos' },
    { value: '2x3', label: '6 Videos' },
    { value: '3x3', label: '9 Videos' },
    { value: '4x3', label: '12 Videos' },
    { value: '4x4', label: '16 Videos' }
  ]

  return (
    <div className="flex gap-2">
      {layouts.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onLayoutChange(value)}
          className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
            layout === value
              ? 'bg-blue-600 text-white'
              : 'bg-dark-tertiary text-slate-300 hover:bg-slate-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export default LayoutSelector
