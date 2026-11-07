import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type EmptyStateIcon = React.ComponentType<{ className?: string }> | React.ReactNode

interface EmptyStateProps {
  icon?: EmptyStateIcon
  title: string
  description?: string
  action?: React.ReactNode
  actionLabel?: string
  onAction?: () => void
  className?: string
}

function renderIcon(icon: EmptyStateIcon) {
  if (React.isValidElement(icon)) {
    return icon
  }
  if (typeof icon === "function") {
    const Icon = icon as React.ComponentType<{ className?: string }>
    return <Icon className="size-10 text-muted-foreground/50" />
  }
  return icon
}

function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center",
        className
      )}
    >
      {icon ? <div className="mb-3">{renderIcon(icon)}</div> : null}
      <p className="font-semibold mb-1">{title}</p>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
      {!action && actionLabel ? (
        <div className="mt-4">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      ) : null}
    </div>
  )
}

export { EmptyState }
export default EmptyState