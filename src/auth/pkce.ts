// pkce.ts
// PKCE verifier (32 random bytes, base64url, 43 chars) and S256 challenge; state (16 bytes, 22 chars).
// oauth.md 9.3. `plain` is never produced.

import * as Crypto from "expo-crypto"
import { base64UrlEncode, utf8Encode } from "./base64"

export function createVerifier(): string {
	return base64UrlEncode(Crypto.getRandomBytes(32))
}

export async function challengeS256(verifier: string): Promise<string> {
	const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, utf8Encode(verifier))
	return base64UrlEncode(new Uint8Array(digest))
}

export function createState(): string {
	return base64UrlEncode(Crypto.getRandomBytes(16))
}
