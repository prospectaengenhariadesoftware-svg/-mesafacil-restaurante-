import Link from 'next/link';
import { createTeamMemberAction, removeTeamMemberAction, updateTeamMemberAction } from '@/app/actions/team';
import type { TenantRole, TenantUserStatus } from '@/lib/types/saas';
import { CreateModal } from '@/components/ui/create-modal';

export type TeamMemberSummary = {
  id: string;
  user_id: string;
  role: TenantRole;
  status: TenantUserStatus;
  created_at: string;
  profiles?: {
    name: string;
    email: string;
    phone: string | null;
    status: string;
  } | null;
};

type TeamStatus = 'all' | TenantUserStatus;
type TeamRole = 'all' | Exclude<TenantRole, 'super_admin'>;
type TeamSort = 'created_at' | 'role' | 'status';
type TeamDirection = 'asc' | 'desc';

export type TeamFilters = {
  q: string;
  role: TeamRole;
  status: TeamStatus;
  sort: TeamSort;
  dir: TeamDirection;
  page: number;
};

const editableRoles: Exclude<TenantRole, 'super_admin'>[] = ['owner', 'admin', 'manager', 'waiter', 'attendant', 'kitchen', 'cashier'];
const addableRoles: Exclude<TenantRole, 'super_admin' | 'owner'>[] = ['admin', 'manager', 'waiter', 'attendant', 'kitchen', 'cashier'];
const editableStatuses: Exclude<TenantUserStatus, 'invited'>[] = ['active', 'disabled', 'removed'];
const formStatuses: Exclude<TenantUserStatus, 'invited' | 'removed'>[] = ['active', 'disabled'];

const roleLabels: Record<TenantRole, string> = {
  super_admin: 'Super admin',
  owner: 'Proprietário',
  admin: 'Administrador',
  manager: 'Gerente',
  waiter: 'Garçom',
  attendant: 'Atendente',
  kitchen: 'Cozinha',
  cashier: 'Caixa',
};

const roleDescriptions: Record<Exclude<TenantRole, 'super_admin'>, string> = {
  owner: 'Controle total do restaurante e permissões críticas.',
  admin: 'Gerencia cadastros, equipe e operação.',
  manager: 'Acompanha operação e cadastros principais.',
  waiter: 'Atende mesas e acompanha pedidos.',
  attendant: 'Atendimento e apoio ao salão.',
  kitchen: 'Visualiza e atualiza pedidos da cozinha.',
  cashier: 'Opera caixa, pagamentos e fechamento.',
};

const statusLabels: Record<TenantUserStatus, string> = {
  invited: 'Convidado',
  active: 'Ativo',
  disabled: 'Desativado',
  removed: 'Removido',
};

function buildQuery(tenantId: string, filters: TeamFilters, overrides: Partial<TeamFilters> = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.role !== 'all') params.set('role', next.role);
  if (next.status !== 'all') params.set('status', next.status);
  if (next.sort !== 'created_at') params.set('sort', next.sort);
  if (next.dir !== 'asc') params.set('dir', next.dir);
  if (next.page > 1) params.set('page', String(next.page));
  const suffix = params.toString();
  return `/tenants/${tenantId}/equipe${suffix ? `?${suffix}` : ''}`;
}

function roleBadgeClass(role: TenantRole) {
  if (role === 'owner') return 'bg-red-50 text-red-700 border-red-100';
  if (role === 'admin') return 'bg-amber-50 text-amber-800 border-amber-100';
  if (role === 'manager') return 'bg-blue-50 text-blue-700 border-blue-100';
  return 'bg-stone-100 text-stone-700 border-stone-200';
}

function statusBadgeClass(status: TenantUserStatus) {
  if (status === 'active') return 'bg-green-50 text-green-700 border-green-100';
  if (status === 'invited') return 'bg-blue-50 text-blue-700 border-blue-100';
  if (status === 'disabled') return 'bg-amber-50 text-amber-800 border-amber-100';
  return 'bg-stone-200 text-stone-600 border-stone-300';
}

function initials(nameOrEmail: string) {
  const cleaned = nameOrEmail.trim();
  if (!cleaned) return 'MF';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

function RoleSelect({ defaultValue, roles = editableRoles }: Readonly<{ defaultValue?: TenantRole; roles?: readonly Exclude<TenantRole, 'super_admin'>[] }>) {
  return (
    <select name="role" defaultValue={defaultValue ?? roles[0]} className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none focus:border-red-500">
      {roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
    </select>
  );
}

function StatusSelect({ defaultValue }: Readonly<{ defaultValue?: TenantUserStatus }>) {
  return (
    <select name="status" defaultValue={defaultValue === 'removed' || defaultValue === 'invited' ? 'disabled' : (defaultValue ?? 'active')} className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 outline-none focus:border-red-500">
      {formStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
    </select>
  );
}

export function TeamMemberForm({ tenantId }: Readonly<{ tenantId: string }>) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">Permissões</p>
          <h2 className="mt-1 text-xl font-bold text-stone-950">Equipe do restaurante</h2>
          <p className="mt-1 max-w-2xl text-sm text-stone-500">Adicione usuários já cadastrados no MesaFácil e defina o papel operacional de cada pessoa.</p>
        </div>
        <CreateModal
          triggerLabel="+ Adicionar membro"
          eyebrow="Novo vínculo"
          title="Adicionar membro existente"
          description="Informe o e-mail de um usuário já cadastrado no MesaFácil. Convite externo por e-mail ainda não dispara envio automático."
        >
          <form action={createTeamMemberAction} className="space-y-5">
            <input type="hidden" name="tenantId" value={tenantId} />
            <label className="block text-sm font-medium text-stone-600">
              E-mail cadastrado
              <input name="email" type="email" required placeholder="usuario@empresa.com" className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-stone-600">Papel<RoleSelect roles={addableRoles} /></label>
              <label className="block text-sm font-medium text-stone-600">Status<StatusSelect /></label>
            </div>
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Por segurança, o papel Proprietário só pode ser concedido depois por um owner existente.</p>
            <button type="submit" className="min-h-11 rounded-full bg-red-500 px-5 py-3 text-sm font-bold text-white hover:bg-red-600">Adicionar à equipe</button>
          </form>
        </CreateModal>
      </div>
    </section>
  );
}

export function TeamManager({
  tenantId,
  members,
  filters,
  total,
  pageSize,
}: Readonly<{
  tenantId: string;
  members: TeamMemberSummary[];
  filters: TeamFilters;
  total: number;
  pageSize: number;
}>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">Acessos</p>
          <h2 className="mt-1 text-xl font-bold text-stone-950">Membros e permissões</h2>
          <p className="mt-1 text-sm text-stone-500">{total} vínculo(s) encontrados neste restaurante.</p>
        </div>
        <Link href={buildQuery(tenantId, filters, { q: '', role: 'all', status: 'all', sort: 'created_at', dir: 'asc', page: 1 })} className="w-fit rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:border-red-300 hover:text-red-600">Limpar filtros</Link>
      </div>

      <form className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_auto]" action={`/tenants/${tenantId}/equipe`}>
        <input name="q" defaultValue={filters.q} placeholder="Buscar por nome, e-mail ou telefone" className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500" />
        <select name="role" defaultValue={filters.role} className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
          <option value="all">Todos os papéis</option>
          {editableRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
        </select>
        <select name="status" defaultValue={filters.status} className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
          <option value="all">Todos os status</option>
          {editableStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
        </select>
        <select name="sort" defaultValue={filters.sort} className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
          <option value="created_at">Data</option>
          <option value="role">Papel</option>
          <option value="status">Status</option>
        </select>
        <select name="dir" defaultValue={filters.dir} className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
          <option value="asc">Crescente</option>
          <option value="desc">Decrescente</option>
        </select>
        <button className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600">Filtrar</button>
      </form>

      {members.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-center text-sm text-stone-500">Nenhum membro encontrado para os filtros atuais.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {members.map((member) => {
            const displayName = member.profiles?.name ?? 'Usuário sem perfil';
            const displayEmail = member.profiles?.email ?? member.user_id;
            return (
              <article key={member.id} className="flex min-h-full flex-col rounded-3xl border border-stone-200 bg-stone-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-white hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-sm font-black text-red-600">{initials(displayName !== 'Usuário sem perfil' ? displayName : displayEmail)}</div>
                    <div className="min-w-0">
                      <h3 className="break-words font-bold text-stone-950">{displayName}</h3>
                      <p className="break-all text-sm text-stone-500">{displayEmail}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${statusBadgeClass(member.status)}`}>{statusLabels[member.status]}</span>
                </div>

                {member.profiles?.phone ? <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-sm text-stone-600">Telefone: <strong>{member.profiles.phone}</strong></p> : null}

                <div className="mt-4 grid gap-2 text-sm">
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Papel</p>
                    <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${roleBadgeClass(member.role)}`}>{roleLabels[member.role]}</span>
                    {member.role !== 'super_admin' ? <p className="mt-2 text-xs text-stone-500">{roleDescriptions[member.role]}</p> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-500">
                    <span className="rounded-2xl bg-white px-3 py-2">Vínculo: <strong className="text-stone-800">{statusLabels[member.status]}</strong></span>
                    <span className="rounded-2xl bg-white px-3 py-2">Criado: <strong className="text-stone-800">{new Date(member.created_at).toLocaleDateString('pt-BR')}</strong></span>
                  </div>
                </div>

                <div className="mt-auto flex flex-col gap-2 pt-4 sm:flex-row">
                  <CreateModal
                    triggerLabel="Editar acesso"
                    eyebrow="Permissões"
                    title={displayName}
                    description="Altere o papel e o status do vínculo deste membro. Regras críticas de owner continuam validadas no servidor."
                  >
                    <form action={updateTeamMemberAction} className="space-y-5">
                      <input type="hidden" name="tenantId" value={tenantId} />
                      <input type="hidden" name="memberId" value={member.id} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-medium text-stone-600">Papel<RoleSelect defaultValue={member.role} /></label>
                        <label className="block text-sm font-medium text-stone-600">Status<StatusSelect defaultValue={member.status} /></label>
                      </div>
                      <button type="submit" className="min-h-11 rounded-full bg-red-500 px-5 py-3 text-sm font-bold text-white hover:bg-red-600">Salvar permissões</button>
                    </form>
                  </CreateModal>

                  <details className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-1">
                    <summary className="cursor-pointer font-bold">Remover</summary>
                    <form action={removeTeamMemberAction} className="mt-4 space-y-3">
                      <input type="hidden" name="tenantId" value={tenantId} />
                      <input type="hidden" name="memberId" value={member.id} />
                      <p className="text-sm text-red-700/80">A remoção marca o vínculo como removido e preserva auditoria.</p>
                      <label className="block text-sm font-medium text-stone-700">
                        Digite CONFIRMAR
                        <input name="confirmDelete" required pattern="CONFIRMAR" className="mt-2 w-full rounded-xl border border-red-200 bg-white px-4 py-2 text-stone-950 outline-none focus:border-red-400" />
                      </label>
                      <button type="submit" className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100">Remover vínculo</button>
                    </form>
                  </details>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4 text-sm text-stone-500">
        <span>Página {filters.page} de {totalPages}</span>
        <div className="flex gap-2">
          <Link aria-disabled={filters.page <= 1} href={buildQuery(tenantId, filters, { page: Math.max(1, filters.page - 1) })} className={`rounded-full border border-stone-300 px-4 py-2 ${filters.page <= 1 ? 'pointer-events-none opacity-40' : 'hover:border-red-500 hover:text-red-600'}`}>Anterior</Link>
          <Link aria-disabled={filters.page >= totalPages} href={buildQuery(tenantId, filters, { page: Math.min(totalPages, filters.page + 1) })} className={`rounded-full border border-stone-300 px-4 py-2 ${filters.page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:border-red-500 hover:text-red-600'}`}>Próxima</Link>
        </div>
      </div>
    </section>
  );
}
