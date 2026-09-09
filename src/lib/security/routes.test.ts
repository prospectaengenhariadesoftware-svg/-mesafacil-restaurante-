import { describe, expect, it } from 'vitest';
import { getProtectedRouteRedirect } from './routes';

describe('protected routes', () => {
  it('redirects unauthenticated admin access to login preserving next path', () => {
    expect(getProtectedRouteRedirect('/dashboard', false)).toBe('/login?next=%2Fdashboard');
    expect(getProtectedRouteRedirect('/tenants/abc', false)).toBe('/login?next=%2Ftenants%2Fabc');
  });

  it('does not redirect public auth routes or authenticated users', () => {
    expect(getProtectedRouteRedirect('/login', false)).toBeNull();
    expect(getProtectedRouteRedirect('/cadastro', false)).toBeNull();
    expect(getProtectedRouteRedirect('/dashboard', true)).toBeNull();
  });
});
