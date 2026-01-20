
import * as React from "react"
import { cn } from "@/lib/utils"

export const Separator = ({ className, orientation = "horizontal" }: any) => (
  <div
    className={cn(
      "shrink-0 bg-slate-200",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )}
  />
)
