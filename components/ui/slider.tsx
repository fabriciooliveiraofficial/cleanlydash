import * as React from "react"
import { cn } from "@/lib/utils"

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value: number[];
    max: number;
    step: number;
    onValueChange: (value: number[]) => void;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
    ({ className, value, max, step, onValueChange, ...props }, ref) => {
        return (
            <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
                <input
                    type="range"
                    min={0}
                    max={max}
                    step={step}
                    value={value[0]}
                    onChange={(e) => onValueChange([parseFloat(e.target.value)])}
                    className={cn(
                        "w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer",
                        "accent-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    )}
                    ref={ref}
                    {...props}
                />
            </div>
        )
    }
)
Slider.displayName = "Slider"

export { Slider }
