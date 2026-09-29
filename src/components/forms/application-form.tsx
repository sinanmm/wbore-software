"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, User, MapPin, FileText, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EvidenceUploader, EvidenceFileItem } from "./evidence-uploader";

const CATEGORIES = [
  "Technology & Innovation",
  "Science & Research",
  "Sports & Athletics",
  "Arts & Culture",
  "Business & Leadership",
  "Education & Academics",
  "Humanitarian & Social",
  "Environment & Sustainability",
  "Media & Entertainment",
  "Other Distinctions",
];

export function ApplicationForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    applicationNumber: string;
    applicationId: string;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    address: "",
    category: CATEGORIES[0],
    achievementTitle: "",
    description: "",
    place: "",
    supportingDetails: "",
  });

  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFileItem[]>([]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validateStep1 = () => {
    if (!formData.fullName.trim()) return "Full name is required";
    if (!formData.email.trim() || !formData.email.includes("@"))
      return "Valid email address is required";
    if (!formData.phone.trim()) return "Phone number is required";
    if (!formData.country.trim()) return "Country is required";
    if (!formData.address.trim()) return "Residential / Office address is required";
    return null;
  };

  const validateStep2 = () => {
    if (!formData.category.trim()) return "Category is required";
    if (!formData.achievementTitle.trim()) return "Achievement title is required";
    if (!formData.description.trim() || formData.description.length < 15)
      return "Achievement description must be at least 15 characters";
    if (!formData.place.trim()) return "Place / Location of achievement is required";
    return null;
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setErrorMsg(err);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) {
        setErrorMsg(err);
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const step1Err = validateStep1();
    if (step1Err) {
      setStep(1);
      setErrorMsg(step1Err);
      return;
    }

    const step2Err = validateStep2();
    if (step2Err) {
      setStep(2);
      setErrorMsg(step2Err);
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append("fullName", formData.fullName);
      submitData.append("email", formData.email);
      submitData.append("phone", formData.phone);
      submitData.append("country", formData.country);
      submitData.append("address", formData.address);
      submitData.append("category", formData.category);
      submitData.append("achievementTitle", formData.achievementTitle);
      submitData.append("description", formData.description);
      submitData.append("place", formData.place);
      submitData.append("supportingDetails", formData.supportingDetails);

      evidenceFiles.forEach((item) => {
        submitData.append("evidenceFiles", item.file);
      });

      const response = await fetch("/api/applications", {
        method: "POST",
        body: submitData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Submission failed. Please check your details.");
      }

      setSubmissionSuccess({
        applicationNumber: data.applicationNumber,
        applicationId: data.applicationId,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong while submitting the application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionSuccess) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
        <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight font-serif">
            Application Received Successfully
          </h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            Your application for recognition has been lodged with the World Book of Record
            Excellence adjudication committee.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 inline-block text-left w-full max-w-md">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Official Application Number
          </p>
          <p className="text-2xl font-mono font-bold text-amber-400 mt-1 select-all">
            {submissionSuccess.applicationNumber}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            Please retain this number for future reference and verification status tracking.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="gold"
            onClick={() => {
              setSubmissionSuccess(null);
              setStep(1);
              setFormData({
                fullName: "",
                email: "",
                phone: "",
                country: "",
                address: "",
                category: CATEGORIES[0],
                achievementTitle: "",
                description: "",
                place: "",
                supportingDetails: "",
              });
              setEvidenceFiles([]);
            }}
          >
            Submit Another Application
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/verify")}
          >
            Go to Verification Portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Header & Step Tracker */}
      <div className="p-6 sm:p-8 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-gold">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-serif">
              Apply for World Record Excellence
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Submit your candidate record application for adjudication and certification.
            </p>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-800/60">
          <div
            className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold ${
              step === 1
                ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                : step > 1
                ? "text-emerald-400"
                : "text-slate-500"
            }`}
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">1. Personal Info</span>
            <span className="sm:hidden">1. Personal</span>
          </div>

          <div
            className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold ${
              step === 2
                ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                : step > 2
                ? "text-emerald-400"
                : "text-slate-500"
            }`}
          >
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">2. Achievement</span>
            <span className="sm:hidden">2. Details</span>
          </div>

          <div
            className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold ${
              step === 3
                ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                : "text-slate-500"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">3. Evidence & Submit</span>
            <span className="sm:hidden">3. Evidence</span>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-medium animate-in fade-in duration-200">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: Personal Information */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-amber-400 tracking-wider uppercase">
              Candidate / Applicant Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name / Candidate Name"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="e.g. Dr. Arthur S. Pendleton"
                required
              />

              <Input
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="applicant@domain.com"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone Number (With Country Code)"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+1 (555) 000-0000"
                required
              />

              <Input
                label="Country of Origin / Residence"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                placeholder="United States, United Arab Emirates, etc."
                required
              />
            </div>

            <Textarea
              label="Complete Physical / Official Address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Suite, Street, City, State, Postal Code"
              rows={2}
              required
            />
          </div>
        )}

        {/* STEP 2: Achievement Information */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-amber-400 tracking-wider uppercase">
              Achievement & Record Proposal
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Segment / Category <span className="text-amber-400">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="flex h-11 w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                  required
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Place / Location of Achievement"
                name="place"
                value={formData.place}
                onChange={handleInputChange}
                placeholder="e.g. Dubai, United Arab Emirates"
                required
              />
            </div>

            <Input
              label="Achievement Title"
              name="achievementTitle"
              value={formData.achievementTitle}
              onChange={handleInputChange}
              placeholder="e.g. Autonomous Solar Drone Longest High-Altitude Endurance"
              required
            />

            <Textarea
              label="Achievement Description & Methodology"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Provide comprehensive details about how the achievement was planned, executed, and documented..."
              rows={4}
              required
            />

            <Textarea
              label="Supporting Details / Benchmark References (Optional)"
              name="supportingDetails"
              value={formData.supportingDetails}
              onChange={handleInputChange}
              placeholder="Mention any existing world records, benchmark metrics, or previous holders if known..."
              rows={2}
            />
          </div>
        )}

        {/* STEP 3: Evidence Upload */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-amber-400 tracking-wider uppercase">
              Attach Verification Evidence
            </h3>
            <p className="text-xs text-slate-400">
              Upload clear photographs, official notary/witness affidavits, calibration logs,
              or video documentation.
            </p>

            <EvidenceUploader
              files={evidenceFiles}
              onChange={setEvidenceFiles}
              maxFiles={12}
            />

            {/* Quick Review Summary */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-1.5">
              <p>
                <strong className="text-slate-100">Applicant:</strong> {formData.fullName} (
                {formData.email})
              </p>
              <p>
                <strong className="text-slate-100">Category:</strong> {formData.category} |{" "}
                <strong className="text-slate-100">Place:</strong> {formData.place}
              </p>
              <p>
                <strong className="text-slate-100">Title:</strong> {formData.achievementTitle}
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setErrorMsg(null);
                setStep((prev) => (prev - 1) as any);
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button type="button" variant="gold" onClick={handleNext}>
              Next Step
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="gold"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="px-8 font-bold"
            >
              Submit Official Application
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
