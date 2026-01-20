import * as React from "react"
import { cn } from "@/lib/utils"

const Table = ({ className, ...props }: any) => (
  <div className="relative w-full overflow-auto">
    <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
  </div>
)
const TableHeader = ({ className, ...props }: any) => <thead className={cn("[&_tr]:border-b bg-slate-50/50", className)} {...props} />
const TableBody = ({ className, ...props }: any) => <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
const TableFooter = ({ className, ...props }: any) => <tfoot className={cn("border-t bg-slate-50/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
const TableRow = ({ className, ...props }: any) => <tr className={cn("border-b transition-colors hover:bg-slate-50/30 data-[state=selected]:bg-slate-100", className)} {...props} />
const TableHead = ({ className, ...props }: any) => <th className={cn("h-12 px-4 text-left align-middle font-medium text-slate-500 [&:has([role=checkbox])]:pr-0", className)} {...props} />
const TableCell = ({ className, ...props }: any) => <td className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell }
