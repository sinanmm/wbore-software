import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Book of Record Excellence - Certificate Management System",
  description:
    "Official application, adjudication, certificate generation, and verification registry for World Book of Record Excellence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#050914] text-slate-100 antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
