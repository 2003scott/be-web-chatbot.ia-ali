import crypto from "node:crypto";
import { env } from "../../config";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  picture?: string;
};

type SessionPayload = {
  user: AuthUser;
  exp: number;
};

const SESSION_COOKIE_NAME = "ali_session";
const OAUTH_STATE_COOKIE_NAME = "ali_oauth_state";
const OAUTH_VERIFIER_COOKIE_NAME = "ali_oauth_verifier";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const base64UrlEncode = (value: string) =>
  Buffer.from(value, "utf8").toString("base64url");

const base64UrlEncodeBytes = (value: Buffer) =>
  value.toString("base64url");

const base64UrlDecode = (value: string) =>
  Buffer.from(value, "base64url").toString("utf8");

const createSignature = (payload: string) =>
  crypto
    .createHmac("sha256", env.AUTH_SECRET)
    .update(payload)
    .digest("base64url");

export const buildSessionToken = (user: AuthUser) => {
  if (!env.AUTH_SECRET) {
    throw new Error("Missing AUTH_SECRET environment variable.");
  }

  const payload: SessionPayload = {
    user,
    exp: Date.now() + COOKIE_MAX_AGE_SECONDS * 1000,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createSignature(encodedPayload);

  return `${encodedPayload}.${signature}`;
};

export const verifySessionToken = (token?: string): AuthUser | null => {
  if (!token || !env.AUTH_SECRET) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createSignature(encodedPayload);

  if (expectedSignature.length !== signature.length) {
    return null;
  }

  const signatureMatches = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!signatureMatches) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;

    if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return null;
    }

    return payload.user;
  } catch {
    return null;
  }
};

export const parseCookieHeader = (cookieHeader?: string) =>
  Object.fromEntries(
    (cookieHeader ?? "")
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separatorIndex = cookie.indexOf("=");

        if (separatorIndex === -1) {
          return [cookie, ""];
        }

        return [
          decodeURIComponent(cookie.slice(0, separatorIndex)),
          decodeURIComponent(cookie.slice(separatorIndex + 1)),
        ];
      })
  ) as Record<string, string>;

export const buildCookie = (
  name: string,
  value: string,
  options: { httpOnly?: boolean; maxAge?: number; path?: string; sameSite?: "Lax" | "Strict" | "None"; secure?: boolean } = {}
) => {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }

  parts.push(`Path=${options.path ?? "/"}`);

  if (options.httpOnly !== false) {
    parts.push("HttpOnly");
  }

  parts.push(`SameSite=${options.sameSite ?? "Lax"}`);

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
};

export const SESSION_COOKIE = SESSION_COOKIE_NAME;
export const OAUTH_STATE_COOKIE = OAUTH_STATE_COOKIE_NAME;
export const OAUTH_VERIFIER_COOKIE = OAUTH_VERIFIER_COOKIE_NAME;

export const getGoogleAuthUrl = async (state: string, codeChallenge: string) => {
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  return authUrl.toString();
};

export const getGoogleTokens = async (
  code: string,
  codeVerifier: string,
  state: string
) => {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    }),
  });

  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status}): ${bodyText}`);
  }

  try {
    return JSON.parse(bodyText) as {
      access_token?: string;
      id_token?: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
    };
  } catch {
    throw new Error(`Google token exchange returned invalid JSON: ${bodyText}`);
  }
};

export const getGoogleProfile = async (
  accessToken: string,
  expectedSubject?: string
) => {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(`Google userinfo request failed (${response.status}): ${bodyText}`);
  }

  const profile = JSON.parse(bodyText) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  if (expectedSubject && profile.sub && profile.sub !== expectedSubject) {
    throw new Error("Google userinfo subject mismatch.");
  }

  return profile;
};

export const createOAuthState = () => randomState();

const randomState = () => base64UrlEncodeBytes(crypto.randomBytes(16));

const randomPKCECodeVerifier = () => base64UrlEncodeBytes(crypto.randomBytes(32));

const calculatePKCECodeChallenge = async (verifier: string) =>
  base64UrlEncodeBytes(crypto.createHash("sha256").update(verifier).digest());

export const createCodeVerifier = () => randomPKCECodeVerifier();

export const createCodeChallenge = async (verifier: string) =>
  calculatePKCECodeChallenge(verifier);

export const isSecureCookie = () => env.FRONTEND_URL.startsWith("https://");