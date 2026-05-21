'use client'

import { motion } from 'framer-motion'

interface Props {
  rows?: number
  cols?: number
}

// Skeleton that matches the final table shape: header row + N body rows
// of skeleton cells. Use under <thead>/<tbody> swaps or as a placeholder.
export function TableSkeleton({ rows = 6, cols = 7 }: Props) {
  return (
    <div className="p-6 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="grid items-center gap-3"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="h-4 rounded animate-pulse"
              style={{
                background: '#F5F5F4',
                width: j === 0 ? '70%' : j === cols - 1 ? '60%' : '90%',
              }}
            />
          ))}
        </motion.div>
      ))}
    </div>
  )
}
