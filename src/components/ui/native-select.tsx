import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  wrapperClassName?: string;
}

export function NativeSelect({ className, wrapperClassName, children, ...props }: NativeSelectProps) {
  return <span className={cn("relative inline-block", wrapperClassName)}>
    <select className={cn("appearance-none pr-8", className)} {...props}>{children}</select>
    <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
  </span>;
}
