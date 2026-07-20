import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  rows?: number
  className?: string
}

export function LoadingSkeleton({ rows = 4, className }: LoadingSkeletonProps) {
  return (
    <div className={cn('space-y-3 animate-pulse', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-10 rounded-md bg-primary-50/80" />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border p-6 space-y-4 animate-pulse">
      <div className="h-5 w-40 rounded bg-primary-50" />
      <LoadingSkeleton rows={5} />
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden animate-pulse">
      <div className="h-10 bg-primary-50/80 border-b border-border" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-12 border-b border-border last:border-b-0 bg-white/60" />
      ))}
    </div>
  )
}
