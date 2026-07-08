import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary-100 text-primary-800",
        accent: "border-transparent bg-accent-50 text-accent-700",
        outline: "border-border text-foreground bg-white",
        danger: "border-transparent bg-danger-50 text-danger-700",
        warning: "border-transparent bg-warning-50 text-warning-700",
        success: "border-transparent bg-success-50 text-success-700",
        info: "border-transparent bg-info-50 text-info-700",
        neutral: "border-transparent bg-gray-100 text-gray-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
