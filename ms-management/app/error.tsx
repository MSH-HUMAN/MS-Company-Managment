"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 select-none">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200/80 shadow-xl text-center flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Unable to load data</h2>
          <p className="text-slate-500 text-sm mt-1">
            An unexpected issue occurred while rendering this page. Please try again.
          </p>
        </div>
        <div className="flex gap-3 w-full mt-2">
          <Button
            onClick={() => reset()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/dashboard";
              }
            }}
            className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl py-2.5"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
