import React, { Suspense } from "react";
import { VerifyForm } from "@/components/forms/verify-form";

export const metadata = {
  title: "Verify Certificate & Record ID | World Book of Record Excellence",
  description:
    "Verify the authenticity and validity of any World Book of Record Excellence certificate by Record ID.",
};

export default function VerifyPage() {
  return (
    <div className="py-4 space-y-6">
      <Suspense
        fallback={
          <div className="p-12 text-center text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent mx-auto mb-3" />
            <p className="text-sm">Loading verification registry...</p>
          </div>
        }
      >
        <VerifyForm />
      </Suspense>
    </div>
  );
}
