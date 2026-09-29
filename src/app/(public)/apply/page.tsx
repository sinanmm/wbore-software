import React from "react";
import { ApplicationForm } from "@/components/forms/application-form";

export const metadata = {
  title: "Apply for Record Recognition | World Book of Record Excellence",
  description:
    "Official application form for submitting world record candidates, achievements, and supporting verification evidence.",
};

export default function ApplyPage() {
  return (
    <div className="py-4 space-y-6">
      <ApplicationForm />
    </div>
  );
}
