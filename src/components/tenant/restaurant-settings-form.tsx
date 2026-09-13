import { updateRestaurantSettingsAction } from '@/app/actions/settings';
import type { Tenant, TenantRole, TenantSettings } from '@/lib/types/saas';

type Props = Readonly<{
  tenant: Tenant;
  settings: TenantSettings | null;
  role: TenantRole;
}>;

function serviceFeeValue(settings: TenantSettings | null): string {
  const cents = settings?.service_fee_basis_points ?? 0;
  return String(cents / 100).replace('.', ',');
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  required = false,
  placeholder,
}: Readonly<{
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
}>) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-stone-800">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-950 outline-none transition focus:border-red-500"
      />
    </label>
  );
}

function TextArea({ label, name, defaultValue, maxLength }: Readonly<{ label: string; name: string; defaultValue?: string | null; maxLength: number }>) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-stone-800">{label}</span>
      <textarea
        name={name}
        rows={3}
        maxLength={maxLength}
        defaultValue={defaultValue ?? ''}
        className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-950 outline-none transition focus:border-red-500"
      />
    </label>
  );
}

export function RestaurantSettingsForm({ tenant, settings, role }: Props) {
  const canEdit = role === 'owner' || role === 'admin';
  const publicMenuUrl = `/r/${tenant.public_slug ?? 'restaurante'}/m/[qr-token-da-mesa]`;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Configurações do restaurante</h2>
            <p className="mt-1 text-sm text-stone-500">Edição real do cadastro público e regras operacionais do tenant.</p>
          </div>
          <span className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-600">Edição: {canEdit ? 'owner/admin' : 'bloqueada'}</span>
        </div>

        <dl className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><dt className="text-xs uppercase tracking-wide text-stone-400">Status SaaS</dt><dd className="mt-1 font-semibold text-stone-950">{tenant.status}</dd></div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><dt className="text-xs uppercase tracking-wide text-stone-400">Status operacional</dt><dd className="mt-1 font-semibold text-stone-950">{settings?.operating_status ?? 'closed'}</dd></div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><dt className="text-xs uppercase tracking-wide text-stone-400">Taxa de serviço</dt><dd className="mt-1 font-semibold text-stone-950">{((settings?.service_fee_basis_points ?? 0) / 100).toLocaleString('pt-BR')}%</dd></div>
        </dl>

        <p className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          URL pública base: <span className="font-mono">{publicMenuUrl}</span>
        </p>
      </div>

      <form action={updateRestaurantSettingsAction} className="rounded-2xl border border-stone-200 bg-white p-5">
        <input type="hidden" name="tenantId" value={tenant.id} />
        <fieldset disabled={!canEdit} className="space-y-6 disabled:opacity-60">
          <div>
            <h3 className="text-lg font-bold text-stone-950">Dados cadastrais e públicos</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Nome fantasia" name="name" defaultValue={tenant.name} required />
              <Field label="Slug público" name="publicSlug" defaultValue={tenant.public_slug ?? ''} required />
              <Field label="Razão social" name="legalName" defaultValue={tenant.legal_name} />
              <Field label="Documento" name="document" defaultValue={tenant.document} />
              <Field label="E-mail" name="email" type="email" defaultValue={tenant.email} />
              <Field label="Telefone" name="phone" defaultValue={tenant.phone} />
            </div>
            <div className="mt-4">
              <TextArea label="Descrição pública" name="publicDescription" defaultValue={settings?.public_description} maxLength={280} />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-stone-950">Endereço e operação</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Endereço" name="addressLine" defaultValue={settings?.address_line} />
              <Field label="Cidade" name="city" defaultValue={settings?.city} />
              <Field label="UF" name="state" defaultValue={settings?.state} placeholder="SP" />
              <Field label="Tempo médio de preparo (min)" name="estimatedPrepMinutes" type="number" defaultValue={settings?.estimated_prep_minutes} />
              <Field label="Taxa de serviço (%)" name="serviceFeePercent" defaultValue={serviceFeeValue(settings)} />
              <label className="block">
                <span className="text-sm font-semibold text-stone-800">Status operacional</span>
                <select name="operatingStatus" defaultValue={settings?.operating_status ?? 'closed'} className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-950 outline-none transition focus:border-red-500">
                  <option value="open">Aberto</option>
                  <option value="paused">Pausado</option>
                  <option value="closed">Fechado</option>
                </select>
              </label>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-800">
                <input type="hidden" name="acceptsQrOrders" value="false" />
                <input type="checkbox" name="acceptsQrOrders" value="true" defaultChecked={settings?.accepts_qr_orders ?? false} className="h-4 w-4 accent-red-500" />
                Aceitar pedidos pelo QR Code
              </label>
              <TextArea label="Mensagem pública no cardápio" name="publicNotice" defaultValue={settings?.public_notice} maxLength={220} />
            </div>
          </div>

          <button type="submit" className="rounded-xl bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-600">
            Salvar configurações
          </button>
        </fieldset>
      </form>
    </section>
  );
}
