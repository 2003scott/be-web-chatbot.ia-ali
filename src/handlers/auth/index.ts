import { Request, Response } from "express";
import {
  buildCookie,
  buildSessionToken,
  createCodeChallenge,
  createCodeVerifier,
  createOAuthState,
  getGoogleAuthUrl,
  getGoogleProfile,
  getGoogleTokens,
  isSecureCookie,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  parseCookieHeader,
  SESSION_COOKIE,
  verifySessionToken,
} from "../../service/auth";
import { env } from "../../config";

export const googleStart = async (_req: Request, res: Response) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.AUTH_SECRET) {
    return res.status(500).json({
      message:
        "Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET or AUTH_SECRET environment variables.",
    });
  }

  const state = createOAuthState();
  const codeVerifier = createCodeVerifier();
  const codeChallenge = await createCodeChallenge(codeVerifier);
  const authUrl = await getGoogleAuthUrl(state, codeChallenge);

  res.setHeader("Set-Cookie", [
    buildCookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      maxAge: 600,
      path: "/api/auth/google/callback",
      sameSite: "Lax",
      secure: isSecureCookie(),
    }),
    buildCookie(OAUTH_VERIFIER_COOKIE, codeVerifier, {
      httpOnly: true,
      maxAge: 600,
      path: "/api/auth/google/callback",
      sameSite: "Lax",
      secure: isSecureCookie(),
    }),
  ]);

  return res.redirect(authUrl);
};

export const googleCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query;
  const cookies = parseCookieHeader(req.headers.cookie);
  const savedState = cookies[OAUTH_STATE_COOKIE];

  if (
    typeof code !== "string" ||
    typeof state !== "string" ||
    !savedState ||
    savedState !== state
  ) {
    return res.status(400).json({
      message: "Invalid Google OAuth callback.",
    });
  }

  const codeVerifier = cookies[OAUTH_VERIFIER_COOKIE];

  if (!codeVerifier) {
    return res.status(400).json({
      message: "Missing Google code verifier.",
    });
  }

  try {
    const tokenSet = await getGoogleTokens(code, codeVerifier, state);
    const googleProfile = await getGoogleProfile(
      String(tokenSet.access_token ?? ""),
      undefined
    );

    if (!googleProfile.sub || !googleProfile.email || !googleProfile.name) {
      return res.status(502).json({
        message: "Google profile did not include the required fields.",
      });
    }

    const user = {
      id: googleProfile.sub,
      email: googleProfile.email,
      name: googleProfile.name,
      picture: googleProfile.picture,
    };
    const sessionToken = buildSessionToken(user);

    res.setHeader(
      "Set-Cookie",
      [
        buildCookie(SESSION_COOKIE, sessionToken, {
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 7,
          path: "/",
          sameSite: "Lax",
          secure: isSecureCookie(),
        }),
        buildCookie(OAUTH_STATE_COOKIE, "", {
          httpOnly: true,
          maxAge: 0,
          path: "/api/auth/google/callback",
          sameSite: "Lax",
          secure: isSecureCookie(),
        }),
        buildCookie(OAUTH_VERIFIER_COOKIE, "", {
          httpOnly: true,
          maxAge: 0,
          path: "/api/auth/google/callback",
          sameSite: "Lax",
          secure: isSecureCookie(),
        }),
      ]
    );

    return res.redirect(env.FRONTEND_URL);
  } catch (error) {
    console.error("Google OAuth callback failed", error);

    const message = error instanceof Error ? error.message : "Unknown Google OAuth error.";

    return res.status(502).json({
      message: "Google OAuth callback failed.",
      detail: message,
    });
  }
};

export const me = async (req: Request, res: Response) => {
  const cookies = parseCookieHeader(req.headers.cookie);
  const user = verifySessionToken(cookies[SESSION_COOKIE]);

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.json({ user });
};

export const logout = async (_req: Request, res: Response) => {
  res.setHeader(
    "Set-Cookie",
    buildCookie(SESSION_COOKIE, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "Lax",
      secure: isSecureCookie(),
    })
  );

  return res.json({ message: "Logged out" });
};