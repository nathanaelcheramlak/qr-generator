"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { ComponentType } from "react";
import type { QrPayload } from "../../lib/qrSigning";
import { verifyAndDecryptPayload } from "../../lib/qrSigning";

// Dynamically import the QR scanner (client-only)
const QrScanner = dynamic(
  async () =>
    import("@yudiel/react-qr-scanner").then(
      (mod) => mod.Scanner as ComponentType<{ onScan?: (result: unknown) => void; onDecode: (data: string | null) => void; onError: (err: unknown) => void; constraints?: MediaTrackConstraints; className?: string }>
    ),
  { ssr: false }
);

type VerifiedInfo = {
  name: string;
  phone: string;
};

export default function ScanPage() {
  const [scanError, setScanError] = useState<string | null>(null);
  const [verifiedInfo, setVerifiedInfo] = useState<VerifiedInfo | null>(null);

  const handleDecode = useCallback(async (data: string | null) => {
    if (!data) return;

    try {
      const parsed: QrPayload = JSON.parse(data);
      const result = await verifyAndDecryptPayload(parsed);

      if (!result.isValid || !result.data) {
        setVerifiedInfo(null);
        setScanError("Invalid or tampered QR code. Signature verification failed.");
        return;
      }

      setScanError(null);
      setVerifiedInfo({ name: result.data.name, phone: result.data.phone });
    } catch (error) {
      setVerifiedInfo(null);
      setScanError("Failed to read QR code. Make sure it was generated here.");
      console.error("QR decode error:", error);
    }
  }, []);

  const handleError = useCallback(
    (err: unknown) => {
      if (!scanError) {
        setScanError("Unable to access camera. Please check permissions.");
      }
      console.error("Camera error:", err);
    },
    [scanError]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-slate-950/40 backdrop-blur-lg p-6 sm:p-8 space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            QR Scanner
          </h1>
          <p className="text-sm text-slate-400">
            Point your camera at a QR code generated on this site. The signature will be verified before showing any details.
          </p>
        </header>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-black/40 overflow-hidden aspect-[3/4] flex items-center justify-center">
            <QrScanner
              onDecode={handleDecode}
              onError={handleError}
              constraints={{ facingMode: "environment" }}
              className="w-full h-full object-cover"
            />
          </div>

          {scanError && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/60 rounded-md px-3 py-2">
              {scanError}
            </p>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-slate-200">
              Scanned Info
            </h2>
            {verifiedInfo ? (
              <div className="text-sm space-y-1">
                <p>
                  <span className="font-medium text-slate-300">Name:</span>{" "}
                  <span className="text-slate-50">{verifiedInfo.name}</span>
                </p>
                <p>
                  <span className="font-medium text-slate-300">Phone:</span>{" "}
                  <span className="text-slate-50">{verifiedInfo.phone}</span>
                </p>
                <p className="text-xs text-emerald-400 pt-1">
                  Signature verified. Data is trusted.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No valid QR scanned yet. Hold a code steady in front of the camera.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-1">
          <Link
            href="/"
            className="text-xs font-medium text-sky-400 hover:text-sky-300 underline underline-offset-4"
          >
            ← Back to generator
          </Link>
          <p className="text-[11px] text-slate-500">
            This demo signs data locally for simplicity.
          </p>
        </div>
      </div>
    </div>
  );
}
