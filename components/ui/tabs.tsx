import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext<any>(null)

const Tabs = ({ children, defaultValue, className }: any) => {
  const [value, setValue] = React.useState(defaultValue)
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn("w-full", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

const TabsList = ({ children, className }: any) => (
  <div className={cn("inline-flex items-center justify-center rounded-lg bg-slate-100 p-1 text-slate-500", className)}>
    {children}
  </div>
)

const TabsTrigger = ({ children, value: triggerValue, className }: any) => {
  const { value, setValue } = React.useContext(TabsContext)
  return (
    <button
      onClick={() => setValue(triggerValue)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        value === triggerValue ? "bg-white text-slate-950 shadow-sm" : "hover:text-slate-900",
        className
      )}
    >
      {children}
    </button>
  )
}

const TabsContent = ({ children, value: contentValue, className }: any) => {
  const { value } = React.useContext(TabsContext)
  if (contentValue !== value) return null
  return <div className={cn("mt-2 focus-visible:outline-none", className)}>{children}</div>
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
