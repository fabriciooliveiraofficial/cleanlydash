
import * as React from "react"
import { cn } from "@/lib/utils"

const DropdownContext = React.createContext<any>(null)

export const DropdownMenu = ({ children }: any) => {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-left" ref={containerRef}>
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

export const DropdownMenuTrigger = ({ children, asChild }: any) => {
  const { open, setOpen } = React.useContext(DropdownContext)
  return React.cloneElement(children, {
    onClick: () => setOpen(!open)
  })
}

export const DropdownMenuContent = ({ children, className, align = "end" }: any) => {
  const { open } = React.useContext(DropdownContext)
  if (!open) return null
  return (
    <div className={cn(
      "absolute z-50 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white p-1 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95",
      align === "end" ? "right-0" : "left-0",
      className
    )}>
      {children}
    </div>
  )
}

export const DropdownMenuItem = ({ children, className, onClick, ...props }: any) => {
  const { setOpen } = React.useContext(DropdownContext)
  return (
    <div
      className={cn(
        "flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors",
        className
      )}
      onClick={(e) => {
        onClick?.(e)
        setOpen(false)
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export const DropdownMenuLabel = ({ children, className }: any) => (
  <div className={cn("px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest", className)}>
    {children}
  </div>
)

export const DropdownMenuSeparator = () => <div className="my-1 h-px bg-slate-100" />
