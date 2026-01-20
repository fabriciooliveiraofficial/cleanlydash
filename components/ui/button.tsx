import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
      default: "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all",
      destructive: "bg-red-500 text-white hover:bg-red-600 active:scale-95 transition-all",
      outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 active:scale-95 transition-all",
      secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 active:scale-95 transition-all",
      ghost: "hover:bg-slate-100 text-slate-600 active:scale-95 transition-all",
      link: "text-indigo-600 underline-offset-4 hover:underline",
    }
    const sizes = {
      default: "h-11 px-6 py-2 rounded-xl",
      sm: "h-9 rounded-lg px-3",
      lg: "h-14 rounded-2xl px-10",
      icon: "h-11 w-11 rounded-xl",
    }

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }