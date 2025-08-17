import nacl from "tweetnacl";

// small helpers for base64 and utf8
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64encode = (bytes) => {
  let str = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    str += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(str);
};
const b64decode = (b64) => {
  const binStr = atob(b64);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
  return bytes;
};

export function ensureKeyPair() {
  const existing = localStorage.getItem("e2ee_keypair");
  if (existing) {
    try { return JSON.parse(existing); } catch { /* ignore */ }
  }
  const kp = nacl.box.keyPair();
  const data = {
    publicKey: b64encode(kp.publicKey),
    secretKey: b64encode(kp.secretKey),
  };
  localStorage.setItem("e2ee_keypair", JSON.stringify(data));
  return data;
}

export function getKeyPair() {
  return ensureKeyPair();
}

export function encryptForPeer(plaintext, peerPublicKeyB64, mySecretKeyB64) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const peerPK = b64decode(peerPublicKeyB64);
  const mySK = b64decode(mySecretKeyB64);
  const shared = nacl.box.before(peerPK, mySK);
  const msgBytes = enc.encode(plaintext);
  const boxed = nacl.box.after(msgBytes, nonce, shared);
  return {
    ciphertext: b64encode(boxed),
    nonce: b64encode(nonce),
    algorithm: "nacl.box",
  };
}

export function decryptFromPeer(ciphertextB64, nonceB64, peerPublicKeyB64, mySecretKeyB64) {
  const peerPK = b64decode(peerPublicKeyB64);
  const mySK = b64decode(mySecretKeyB64);
  const shared = nacl.box.before(peerPK, mySK);
  const nonce = b64decode(nonceB64);
  const boxed = b64decode(ciphertextB64);
  const opened = nacl.box.open.after(boxed, nonce, shared);
  if (!opened) throw new Error("Decryption failed");
  return new TextDecoder().decode(opened);
}
