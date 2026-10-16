/** Public pages a congregant or guest lands on: no app chrome at all. */
const BARE_PREFIXES = ["/s/", "/v/", "/invite/"];
/** Auth pages bring their own full-screen layout. */
const AUTH_PATHS = ["/login", "/signup", "/forgot-password"];

export function hideChrome(pathname: string | null): boolean {
    if (!pathname) return false;
    return BARE_PREFIXES.some((p) => pathname.startsWith(p)) || AUTH_PATHS.includes(pathname);
}
