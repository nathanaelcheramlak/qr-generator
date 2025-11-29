"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import QRCode from "react-qr-code";

export default function Home() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setQrValue(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedPhone) {
      setError("Please enter both name and phone number.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("https://qr-generator-ve0u.onrender.com/api/encrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, phone: trimmedPhone }),
      });

      if (!response.ok) {
        throw new Error("Encryption failed");
      }

      const payload = await response.json();
      setQrValue(JSON.stringify(payload));
    } catch (err) {
      setError("Failed to generate QR code. Please try again.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-slate-950/40 backdrop-blur-lg p-6 sm:p-8 space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Secure QR Generator
          </h1>
          <p className="text-sm text-slate-400">
            Enter a name and phone number to generate a signed QR code. Scan it
            on the scanner page to verify and reveal the info.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-200"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm outline-none ring-0 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 transition"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-slate-200"
            >
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm outline-none ring-0 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 transition"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isGenerating}
            className="w-full inline-flex items-center justify-center rounded-lg bg-sky-500 hover:bg-sky-400 disabled:bg-sky-700/60 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-sky-500/30 transition"
          >
            {isGenerating ? "Generating..." : "Generate QR Code"}
          </button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Generated QR
            </h2>
            <Link
              href="/scan"
              className="text-xs font-medium text-sky-400 hover:text-sky-300 underline underline-offset-4"
            >
              Go to scanner
            </Link>
          </div>

          <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/60 min-h-[200px]">
            {qrValue ? (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-lg bg-white p-3 shadow-lg">
                  <QRCode value={qrValue} size={180} />
                </div>
                <p className="text-[11px] text-slate-400">
                  Scan this code on the{" "}
                  <span className="font-semibold text-sky-300">Scanner</span>{" "}
                  page to verify.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center px-6">
                Fill in the form and click{" "}
                <span className="font-semibold text-slate-200">
                  Generate QR Code
                </span>{" "}
                to see your signed QR here.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

