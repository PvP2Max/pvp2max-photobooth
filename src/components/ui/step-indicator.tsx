import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
  id: string
  label: string
}

interface StepIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: Step[]
  currentStep: string | number
  variant?: "default" | "compact"
}

export function StepIndicator({
  steps,
  currentStep,
  variant = "default",
  className,
  ...props
}: StepIndicatorProps) {
  const currentIndex = typeof currentStep === "number"
    ? currentStep
    : steps.findIndex((s) => s.id === currentStep)

  if (variant === "compact") {
    return (
      <div
        className={cn("flex items-center gap-1.5", className)}
        role="navigation"
        aria-label="Progress"
        {...props}
      >
        {steps.map((step, index) => {
          const isComplete = index < currentIndex
          const isCurrent = index === currentIndex
          return (
            <div
              key={step.id}
              className={cn(
                "size-2 rounded-full transition-all",
                isComplete && "bg-primary",
                isCurrent && "bg-primary w-6",
                !isComplete && !isCurrent && "bg-muted"
              )}
              aria-label={step.label}
              aria-current={isCurrent ? "step" : undefined}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="navigation"
      aria-label="Progress"
      {...props}
    >
      {steps.map((step, index) => {
        const isComplete = index < currentIndex
        const isCurrent = index === currentIndex
        const isLast = index === steps.length - 1

        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-all",
                  isComplete &&
                    "border-primary bg-primary text-primary-foreground",
                  isCurrent &&
                    "border-primary bg-primary/10 text-primary",
                  !isComplete &&
                    !isCurrent &&
                    "border-muted bg-transparent text-muted-foreground"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isComplete ? (
                  <Check className="size-4" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium hidden sm:inline",
                  isCurrent && "text-foreground",
                  !isCurrent && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "h-0.5 flex-1 min-w-4 max-w-12 transition-all",
                  isComplete ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
