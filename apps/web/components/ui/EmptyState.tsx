interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div
          className="flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
          style={{ background: '#F5F5F4', border: '1px solid #E7E5E4' }}
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold" style={{ color: '#0A0A0A' }}>{title}</p>
      {description && (
        <p className="text-sm mt-1.5 max-w-xs leading-relaxed" style={{ color: '#A3A3A3' }}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.98]"
          style={{ background: '#4F46E5', color: '#FFF' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
