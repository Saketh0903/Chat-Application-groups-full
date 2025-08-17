# End-to-End Encryption (E2EE) — What changed

This patch adds optional E2EE for **text messages** using `tweetnacl` (Curve25519 + XSalsa20-Poly1305).

## How it works
- On first login/signup, the client generates a long-term key pair and uploads only the **public key** to the server.
- When you send a message to someone who has a public key, the client:
  1) derives a shared secret (X25519) and
  2) encrypts the message with a random nonce.
- The server stores only ciphertext, nonce and metadata; it **cannot read** the plaintext.
- The recipient decrypts locally using their secret key.

## Notes
- Images are **not** E2E-encrypted in this patch (they still upload to Cloudinary). You can extend E2EE to files by encrypting bytes client-side and uploading the ciphertext.
- Existing plaintext history will continue to render; encrypted messages show as ciphertext on the DB but decrypt in the UI.

## Setup
- Client adds a dependency: `tweetnacl`.
- Make sure to reinstall dependencies:
  ```bash
  cd client && npm i
  cd ../server && npm i
  ```
- Start as usual. No server-side .env changes are required.

## API additions
- `PUT /api/keys` (auth) — body: `{ publicKey }` — Save current user's Curve25519 public key.
- `GET /api/keys/:id` (auth) — fetch another user's public key (users list also includes `publicKey`).
