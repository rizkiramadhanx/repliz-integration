export interface RawSessionCookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: number;
  expirationDate?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

// Ekstensi cookie (Cookie-Editor, EditThisCookie, dll) pakai berbagai format sameSite
// ("no_restriction", "lax", "strict", "unspecified") — normalisasi ke format Playwright.
function normalizeSameSite(
  value: string | undefined,
): 'Strict' | 'Lax' | 'None' {
  switch (value?.toLowerCase()) {
    case 'strict':
      return 'Strict';
    case 'lax':
      return 'Lax';
    case 'no_restriction':
    case 'none':
      return 'None';
    default:
      return 'None';
  }
}

export function toPlaywrightCookies(cookies: RawSessionCookie[]) {
  return cookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain.startsWith('.') ? c.domain : `.${c.domain}`,
    path: c.path ?? '/',
    expires: c.expires ?? c.expirationDate ?? -1,
    httpOnly: c.httpOnly ?? false,
    secure: c.secure ?? true,
    sameSite: normalizeSameSite(c.sameSite),
  }));
}
