
import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

const SheetContext = React.createContext<{ open: boolean; onOpenChange: (open: boolean) => void }>({
  open: false,
  onOpenChange: () => { },
})

export const Sheet = ({ children, open, onOpenChange }: any) => {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

export const SheetContent = ({ children, className }: any) => {
  const { open, onOpenChange } = React.useContext(SheetContext)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null
  if (!open) return null

  // Portal to body to avoid z-index/overflow issues

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end font-sans">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      <div className={cn(
        "relative w-full max-w-md bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-300 border-l border-slate-100 flex flex-col h-full",
        className
      )}>
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-6 top-6 rounded-full p-2 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all hover:scale-110 active:scale-95 z-50"
        >
          <X className="h-6 w-6" />
        </button>
        {children}
      </div>
    </div>,
    document.body
  )
}

export const SheetHeader = ({ children, className }: any) => (
  <div className={cn("flex flex-col space-y-2 mb-6", className)}>{children}</div>
)

export const SheetTitle = ({ children, className }: any) => (
  <h2 className={cn("text-xl font-bold text-slate-900", className)}>{children}</h2>
)

export const SheetDescription = ({ children, className }: any) => (
  <p className={cn("text-sm text-slate-500", className)}>{children}</p>
)
