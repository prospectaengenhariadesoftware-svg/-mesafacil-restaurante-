import { createTeamMemberAction, removeTeamMemberAction, updateTeamMemberAction } from '@/app/actions/team';
import type { TenantRole, TenantUserStatus } from '@/lib/types/saas';

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

function RoleSelect({ defaultValue, roles = editableRoles }: Readonly<{ defaultValue?: TenantRole; roles?: readonly Exclude<TenantRole, 'super_admin'>[] }>) {
  return (
    <select name="role" defaultValue={defaultValue ?? roles[0]} className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
      {roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
    </select>
  );
}

function StatusSelect({ defaultValue }: Readonly<{ defaultValue?: TenantUserStatus }>) {
  return (
    <select name="status" defaultValue={defaultValue === 'removed' || defaultValue === 'invited' ? 'disabled' : (defaultValue ?? 'active')} className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
      {formStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
    </select>
  );
}

export function TeamMemberForm({ tenantId }: Readonly<{ tenantId: string }>) {
  return (
    <form action={createTeamMemberAction} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div>
        <h2 className="text-xl font-bold">Adicionar membro existente</h2>
        <p className="mt-1 text-sm text-stone-500">Adiciona ou reativa um usuário que já possui cadastro no MesaFácil. Convite externo por e-mail ainda não dispara envio automático.</p>
      </div>
      <label className="block text-sm font-medium text-stone-600">
        E-mail cadastrado
        <input name="email" type="email" required placeholder="usuario@empresa.com" className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-stone-950 outline-none focus:border-red-500" />
      </label>
      <label className="block text-sm font-medium text-stone-600">Papel<RoleSelect roles={addableRoles} /></label>
      <label className="block text-sm font-medium text-stone-600">Status<StatusSelect /></label>
      <button className="rounded-full bg-red-500 px-5 py-3 text-sm font-bold text-white hover:bg-red-600">Adicionar à equipe</button>
    </form>
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
    <section className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-bold">Equipe e permissões</h2>
          <p className="mt-1 text-sm text-stone-500">{total} vínculo(s) encontrados neste tenant.</p>
        </div>
        <a href={buildQuery(tenantId, filters, { q: '', role: 'all', status: 'all', sort: 'created_at', dir: 'asc', page: 1 })} className="text-sm font-semibold text-red-600 hover:text-red-600">Limpar filtros</a>
      </div>

      <form className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_auto]" action={`/tenants/${tenantId}/equipe`}>
        <input name="q" defaultValue={filters.q} placeholder="Buscar por nome, e-mail ou telefone" className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500" />
        <select name="role" defaultValue={filters.role} className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
          <option value="all">Todos os papéis</option>
          {editableRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
        </select>
        <select name="status" defaultValue={filters.status} className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
          <option value="all">Todos os status</option>
          {editableStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
        </select>
        <select name="sort" defaultValue={filters.sort} className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
          <option value="created_at">Data</option>
          <option value="role">Papel</option>
          <option value="status">Status</option>
        </select>
        <select name="dir" defaultValue={filters.dir} className="rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-500">
          <option value="asc">Crescente</option>
          <option value="desc">Decrescente</option>
        </select>
        <button className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600">Filtrar</button>
      </form>

      {members.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-500">Nenhum membro encontrado para os filtros atuais.</p>
      ) : (
        <div className="mt-5 grid gap-4">
          {members.map((member) => (
            <article key={member.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-stone-950">{member.profiles?.name ?? 'Usuário sem perfil'}</h3>
                      <p className="mt-1 break-all text-sm text-stone-500">{member.profiles?.email ?? member.user_id}</p>
                      {member.profiles?.phone ? <p className="mt-1 text-sm text-stone-400">{member.profiles.phone}</p> : null}
                    </div>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">{statusLabels[member.status]}</span>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div><dt className="text-stone-400">Papel</dt><dd className="font-semibold text-stone-800">{roleLabels[member.role]}</dd></div>
                    <div><dt className="text-stone-400">Status do vínculo</dt><dd className="font-semibold text-stone-800">{statusLabels[member.status]}</dd></div>
                    <div><dt className="text-stone-400">Criado em</dt><dd className="font-semibold text-stone-800">{new Date(member.created_at).toLocaleDateString('pt-BR')}</dd></div>
                  </dl>
                </div>

                <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-3">
                  <form action={updateTeamMemberAction} className="space-y-3">
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="memberId" value={member.id} />
                    <label className="block text-sm font-medium text-stone-600">Papel<RoleSelect defaultValue={member.role} /></label>
                    <label className="block text-sm font-medium text-stone-600">Status<StatusSelect defaultValue={member.status} /></label>
                    <button className="w-full rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600">Salvar permissões</button>
                  </form>
                  <form action={removeTeamMemberAction} className="space-y-2 border-t border-stone-200 pt-3">
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="memberId" value={member.id} />
                    <input name="confirmDelete" placeholder="Digite CONFIRMAR" className="w-full rounded-xl border border-red-900/60 bg-stone-50 px-3 py-2 text-sm text-stone-950 outline-none focus:border-red-400" />
                    <button className="w-full rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50">Remover vínculo</button>
                    <p className="text-xs text-stone-400">A remoção marca o vínculo como removido e preserva auditoria.</p>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-stone-500">
        <span>Página {filters.page} de {totalPages}</span>
        <div className="flex gap-2">
          <a aria-disabled={filters.page <= 1} href={buildQuery(tenantId, filters, { page: Math.max(1, filters.page - 1) })} className={`rounded-full border border-stone-300 px-4 py-2 ${filters.page <= 1 ? 'pointer-events-none opacity-40' : 'hover:border-red-500 hover:text-red-600'}`}>Anterior</a>
          <a aria-disabled={filters.page >= totalPages} href={buildQuery(tenantId, filters, { page: Math.min(totalPages, filters.page + 1) })} className={`rounded-full border border-stone-300 px-4 py-2 ${filters.page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:border-red-500 hover:text-red-600'}`}>Próxima</a>
        </div>
      </div>
    </section>
  );
}
