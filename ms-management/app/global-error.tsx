"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Global Error:", error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-6 select-none font-sans">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-200/80 shadow-xl text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Unable to load application</h2>
            <p className="text-slate-500 text-sm mt-1">
              Please click Retry to reload the application cleanly.
            </p>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={() => reset()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className="w-4 h-4 animate-spin" />
              Retry Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
