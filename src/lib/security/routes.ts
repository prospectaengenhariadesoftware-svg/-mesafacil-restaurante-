const publicRoutes = new Set(['/login', '/cadastro', '/esqueci-senha', '/redefinir-senha', '/pedido-confirmado']);

export function isPublicRoute(pathname: string): boolean {
  if (publicRoutes.has(pathname)) return true;
  if (pathname === '/') return true;
  if (pathname.startsWith('/r/')) return true;
  if (pathname.startsWith('/_next/')) return true;
  return false;
}

export function isProtectedRoute(pathname: string): boolean {
  return !isPublicRoute(pathname);
}

export function getProtectedRouteRedirect(pathname: string, isAuthenticated: boolean): string | null {
  if (isAuthenticated || !isProtectedRoute(pathname)) return null;
  return `/login?next=${encodeURIComponent(pathname)}`;
}
