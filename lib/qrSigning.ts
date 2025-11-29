// Encrypted payload structure that will be stored in the QR code
export type QrPayload = {
  encrypted: string; // Base64-encoded encrypted data
  iv: string; // Base64-encoded initialization vector
  hash: string; // Signature hash for integrity
};

// Decrypted data structure (internal use only)
export type DecryptedData = {
  name: string;
  phone: string;
};

// NOTE: In a real application this secret must NOT be exposed in the frontend.
// It should live on a backend and the QR should be signed/encrypted there.
// Here we keep it in the client only to satisfy the constraints of this demo.
const SECRET = "qr-demo-shared-secret-change-me";
const SALT = "qr-encryption-salt-v1";

// Helper: Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive encryption key from secret using PBKDF2
async function deriveKey(): Promise<CryptoKey> {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    throw new Error(
      "Web Crypto API is unavailable. This feature requires a Secure Context (HTTPS or localhost)."
    );
  }

  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(SALT),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt data using AES-GCM
async function encryptData(data: DecryptedData): Promise<{ encrypted: string; iv: string }> {
  const key = await deriveKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for GCM
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(JSON.stringify(data));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedData
  );

  return {
    encrypted: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

// Decrypt data using AES-GCM
async function decryptData(encrypted: string, iv: string): Promise<DecryptedData> {
  const key = await deriveKey();
  const encryptedBuffer = base64ToArrayBuffer(encrypted);
  const ivBuffer = base64ToArrayBuffer(iv);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuffer },
    key,
    encryptedBuffer
  );

  const decoder = new TextDecoder();
  const decryptedText = decoder.decode(decryptedBuffer);
  return JSON.parse(decryptedText);
}

// Hash function for signing
async function sha256(input: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    throw new Error(
      "Web Crypto API is unavailable. This feature requires a Secure Context (HTTPS or localhost)."
    );
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

// Create encrypted and signed payload for QR code
export async function createSignedPayload(
  name: string,
  phone: string,
): Promise<QrPayload> {
  const normalizedName = name.trim();
  const normalizedPhone = phone.trim();

  // Encrypt the data
  const { encrypted, iv } = await encryptData({
    name: normalizedName,
    phone: normalizedPhone,
  });

  // Sign the encrypted payload (prevents tampering)
  const hash = await sha256(`${SECRET}|${encrypted}|${iv}`);

  return {
    encrypted,
    iv,
    hash,
  };
}

// Verify signature and decrypt payload
export async function verifyAndDecryptPayload(
  payload: QrPayload
): Promise<{ isValid: boolean; data: DecryptedData | null }> {
  try {
    // First verify the signature
    const expectedHash = await sha256(`${SECRET}|${payload.encrypted}|${payload.iv}`);
    if (expectedHash !== payload.hash) {
      return { isValid: false, data: null };
    }

    // If signature is valid, decrypt the data
    const data = await decryptData(payload.encrypted, payload.iv);
    return { isValid: true, data };
  } catch {
    // Decryption failed (wrong key, corrupted data, etc.)
    return { isValid: false, data: null };
  }
}


