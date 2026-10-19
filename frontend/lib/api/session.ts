const TOKEN_KEY = "pmn_session";

/**
 * Persist JWT across reloads / new tabs.
 * (httpOnly cookie from /verify may not stick on http://localhost when Secure=true.)
 */
function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** One-time move from sessionStorage → localStorage so existing logins survive. */
function migrateFromSession(): string | null {
  try {
    const legacy = window.sessionStorage.getItem(TOKEN_KEY);
    if (!legacy) return null;
    window.localStorage.setItem(TOKEN_KEY, legacy);
    window.sessionStorage.removeItem(TOKEN_KEY);
    return legacy;
  } catch {
    return null;
  }
}

export function getSessionToken(): string | null {
  const store = storage();
  if (!store) return null;
  try {
    const existing = store.getItem(TOKEN_KEY);
    if (existing) return existing;
    return migrateFromSession();
  } catch {
    return null;
  }
}

export function setSessionToken(token: string | null): void {
  const store = storage();
  if (!store) return;
  try {
    if (!token) {
      store.removeItem(TOKEN_KEY);
      try {
        window.sessionStorage.removeItem(TOKEN_KEY);
      } catch {
        /* ignore */
      }
    } else {
      store.setItem(TOKEN_KEY, token);
    }
  } catch {
    /* private mode / blocked storage */
  }
}

export function clearSessionToken(): void {
  setSessionToken(null);
}
