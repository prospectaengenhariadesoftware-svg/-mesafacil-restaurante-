import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile, TenantMembershipWithTenant } from '@/lib/types/saas';

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile?.status === 'disabled' || profile?.status === 'deleted') {
    await supabase.auth.signOut();
    redirect('/login?erro=usuario-desativado');
  }

  return user;
}

export async function getCurrentProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
  return data as Profile | null;
}

export async function getTenantMemberships(userId: string): Promise<TenantMembershipWithTenant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tenant_users')
    .select('*, tenants(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) return [];
  return (data ?? []) as TenantMembershipWithTenant[];
}

export async function requireActiveTenant(tenantId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tenant_users')
    .select('*, tenants(*)')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data || !data.tenants) redirect('/dashboard?erro=tenant-negado');
  return data as TenantMembershipWithTenant;
}
