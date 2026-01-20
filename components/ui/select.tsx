import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

const SelectContext = React.createContext<any>(null)

const Select = ({ children, onValueChange, defaultValue }: any) => {
  const [value, setValue] = React.useState(defaultValue)
  const [open, setOpen] = React.useState(false)
  
  const handleValueChange = (v: any) => {
    setValue(v)
    onValueChange?.(v)
    setOpen(false)
  }

  return (
    <SelectContext.Provider value={{ value, handleValueChange, open, setOpen }}>
      <div className="relative w-full">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = ({ children, className }: any) => {
  const { open, setOpen, value } = React.useContext(SelectContext)
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
}

const SelectValue = ({ placeholder }: any) => {
  const { value } = React.useContext(SelectContext)
  return <span>{value || placeholder}</span>
}

const SelectContent = ({ children, className }: any) => {
  const { open } = React.useContext(SelectContext)
  if (!open) return null
  return (
    <div className={cn("absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 text-slate-950 shadow-md animate-in fade-in zoom-in-95", className)}>
      {children}
    </div>
  )
}

const SelectItem = ({ children, value, className }: any) => {
  const { handleValueChange } = React.useContext(SelectContext)
  return (
    <div
      onClick={() => handleValueChange(value)}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-slate-100 focus:bg-slate-100",
        className
      )}
    >
      {children}
    </div>
  )
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
