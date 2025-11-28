export type QrPayload = {
  name: string;
  phone: string;
  hash: string;
};

// NOTE: In a real application this secret must NOT be exposed in the frontend.
// It should live on a backend and the QR should be signed there.
// Here we keep it in the client only to satisfy the constraints of this demo.
const SECRET = "qr-demo-shared-secret-change-me";

async function sha256(input: string): Promise<string> {
  if (typeof window === "undefined" || !("crypto" in window)) {
    throw new Error("Hashing is only available in the browser environment");
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

export async function createSignedPayload(
  name: string,
  phone: string,
): Promise<QrPayload> {
  const normalizedName = name.trim();
  const normalizedPhone = phone.trim();
  const base = `${normalizedName}|${normalizedPhone}`;
  const hash = await sha256(`${SECRET}|${base}`);

  return {
    name: normalizedName,
    phone: normalizedPhone,
    hash,
  };
}

export async function verifySignedPayload(payload: QrPayload): Promise<boolean> {
  const base = `${payload.name.trim()}|${payload.phone.trim()}`;
  const expectedHash = await sha256(`${SECRET}|${base}`);
  return expectedHash === payload.hash;
}


