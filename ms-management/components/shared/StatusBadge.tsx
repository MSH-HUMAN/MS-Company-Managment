"use strict";

import { Badge } from "@/components/ui/badge";
import { getStatusColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string | null | undefined;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "px-2 py-1 rounded-full text-[9px] font-bold tracking-wide uppercase border select-none h-auto! whitespace-normal! text-center break-words shrink-0 inline-flex items-center justify-center max-w-[120px] leading-tight",
        getStatusColor(status),
        className
      )}
    >
      {status}
    </Badge>
  );
}
