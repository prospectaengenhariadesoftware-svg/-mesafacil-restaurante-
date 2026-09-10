import { redirect } from 'next/navigation';
import { TeamPanel, type TeamMemberSummary } from '@/components/tenant/operational-panels';
import { TenantModulePage } from '@/components/tenant/tenant-module-page';
import { requireActiveTenant } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import type { Profile, TenantUser } from '@/lib/types/saas';
import { isUuid } from '@/lib/validation/auth';

export default async function EquipePage({ params }: Readonly<{ params: Promise<{ tenantId: string }> }>) {
  const { tenantId } = await params;
  if (!isUuid(tenantId)) redirect('/dashboard?erro=tenant-invalido');
  await requireActiveTenant(tenantId);

  const supabase = await createClient();
  const { data: membersData } = await supabase
    .from('tenant_users')
    .select('id, tenant_id, user_id, role, status, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  const members = (membersData ?? []) as TenantUser[];
  const userIds = members.map((member) => member.user_id);
  const { data: profilesData } = userIds.length > 0
    ? await supabase.from('profiles').select('user_id, name, email, phone, status').in('user_id', userIds)
    : { data: [] };

  const profilesByUserId = new Map((profilesData ?? []).map((profile) => [profile.user_id, profile as Pick<Profile, 'name' | 'email' | 'phone' | 'status'>]));
  const hydratedMembers: TeamMemberSummary[] = members.map((member) => ({
    ...member,
    profiles: profilesByUserId.get(member.user_id) ?? null,
  }));

  return (
    <TenantModulePage tenantId={tenantId} module="equipe">
      <TeamPanel members={hydratedMembers} />
    </TenantModulePage>
  );
}
