"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const tooltipContentVariants = cva(
  "bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md text-balance transition-all duration-200 ease-out",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "bg-background text-foreground border border-border",
        ghost: "bg-muted text-muted-foreground",
      },
      size: {
        small: "px-2 py-1 text-xs",
        medium: "px-3 py-1.5 text-xs",
        large: "px-4 py-2 text-sm",
      },
      state: {
        default: "",
        loading: "opacity-75 cursor-wait",
        disabled: "opacity-50 pointer-events-none",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "medium",
      state: "default",
    },
  }
)

/**
 * Provides tooltip context for child components
 */
function TooltipProvider({
  delayDuration = 500,
  skipDelayDuration = 200,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  )
}

/**
 * Root tooltip component that wraps trigger and content
 */
function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

/**
 * Element that triggers the tooltip on hover/focus
 */
function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

interface TooltipContentProps
  extends React.ComponentProps<typeof TooltipPrimitive.Content>,
    VariantProps<typeof tooltipContentVariants> {
  /**
   * Show arrow pointing to trigger element
   * @default true
   */
  showArrow?: boolean
}

/**
 * Tooltip content that appears when triggered
 *
 * @param variant - Visual style variant (primary, secondary, outline, ghost)
 * @param size - Size variant (small, medium, large)
 * @param state - State variant (default, loading, disabled)
 * @param showArrow - Whether to show the arrow pointing to trigger
 */
function TooltipContent({
  className,
  sideOffset = 0,
  variant,
  size,
  state,
  showArrow = true,
  children,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          tooltipContentVariants({ variant, size, state }),
          className
        )}
        onEscapeKeyDown={(event) => {
          event.preventDefault()
          // The tooltip will close automatically when Escape is pressed
        }}
        {...props}
      >
        {children}
        {showArrow && (
          <TooltipPrimitive.Arrow
            className={cn(
              "z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] drop-shadow-sm",
              variant === "primary" && "bg-primary fill-primary",
              variant === "secondary" && "bg-secondary fill-secondary",
              variant === "outline" && "bg-background fill-background border border-border shadow-sm",
              variant === "ghost" && "bg-muted fill-muted",
              !variant && "bg-foreground fill-foreground"
            )}
          />
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, tooltipContentVariants }
