import { updateRestaurantSettingsAction } from '@/app/actions/settings';
import type { Tenant, TenantRole, TenantSettings } from '@/lib/types/saas';
import { RestaurantLogoInput } from './restaurant-logo-input';

type Props = Readonly<{
  tenant: Tenant;
  settings: TenantSettings | null;
  logoUrl: string | null;
  role: TenantRole;
}>;

type FieldProps = Readonly<{
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'numeric' | 'decimal' | 'search';
}>;

function serviceFeeValue(settings: TenantSettings | null): string {
  const cents = settings?.service_fee_basis_points ?? 0;
  return String(cents / 100).replace('.', ',');
}

function statusLabel(status: string | null | undefined) {
  if (status === 'open') return 'Aberto';
  if (status === 'paused') return 'Pausado';
  if (status === 'closed') return 'Fechado';
  return 'Fechado';
}

function statusClass(status: string | null | undefined) {
  if (status === 'open') return 'border-green-100 bg-green-50 text-green-700';
  if (status === 'paused') return 'border-amber-100 bg-amber-50 text-amber-800';
  return 'border-stone-200 bg-stone-100 text-stone-700';
}

function Field({ label, name, defaultValue, type = 'text', required = false, placeholder, hint, inputMode }: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-stone-800">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-red-500 focus:bg-red-50/20"
      />
      {hint ? <span className="mt-1 block text-xs leading-5 text-stone-500">{hint}</span> : null}
    </label>
  );
}

function TextArea({ label, name, defaultValue, maxLength, hint, rows = 4 }: Readonly<{ label: string; name: string; defaultValue?: string | null; maxLength: number; hint?: string; rows?: number }>) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-stone-800">{label}</span>
      <textarea
        name={name}
        rows={rows}
        maxLength={maxLength}
        defaultValue={defaultValue ?? ''}
        className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-red-500 focus:bg-red-50/20"
      />
      {hint ? <span className="mt-1 block text-xs leading-5 text-stone-500">{hint}</span> : null}
    </label>
  );
}

function SummaryCard({ label, value, hint, className = 'border-stone-200 bg-stone-50 text-stone-950' }: Readonly<{ label: string; value: string; hint: string; className?: string }>) {
  return (
    <div className={`rounded-3xl border p-4 ${className}`}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs leading-5 opacity-75">{hint}</p>
    </div>
  );
}

function SectionCard({ eyebrow, title, description, children }: Readonly<{ eyebrow: string; title: string; description: string; children: React.ReactNode }>) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-700">{eyebrow}</p>
        <h3 className="mt-1 text-lg font-black text-stone-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-stone-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function RestaurantSettingsForm({ tenant, settings, logoUrl, role }: Props) {
  const canEdit = role === 'owner' || role === 'admin';
  const publicMenuUrl = `/r/${tenant.public_slug ?? 'restaurante'}/m/[qr-token-da-mesa]`;
  const operatingStatus = settings?.operating_status ?? 'closed';
  const serviceFeePercent = ((settings?.service_fee_basis_points ?? 0) / 100).toLocaleString('pt-BR');

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-red-700 via-red-600 to-red-800 p-5 text-white sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-white">Configurações</p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{tenant.name}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white">Central para dados públicos, funcionamento do QR Code, taxa de serviço e mensagem exibida aos clientes.</p>
            </div>
            <span className="w-fit rounded-full border border-white/30 bg-white/15 px-4 py-2 text-xs font-black text-white backdrop-blur">Edição: {canEdit ? 'owner/admin' : 'bloqueada'}</span>
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-3">
          <SummaryCard label="Status SaaS" value={tenant.status} hint="Situação cadastral do restaurante na plataforma." />
          <SummaryCard label="Operação" value={statusLabel(operatingStatus)} hint="Controla a expectativa de atendimento no cardápio." className={statusClass(operatingStatus)} />
          <SummaryCard label="Taxa" value={`${serviceFeePercent}%`} hint="Percentual usado nos cálculos de caixa/serviço." />
        </div>

        <div className="border-t border-stone-200 p-5">
          <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-black">Endereço público do cardápio por QR</p>
            <p className="mt-2 break-all font-mono text-xs sm:text-sm">{publicMenuUrl}</p>
            <p className="mt-2 text-xs leading-5 text-red-700/80">Cada mesa troca o marcador <strong>[qr-token-da-mesa]</strong> pelo token gerado no módulo Mesas/QR.</p>
          </div>
        </div>
      </div>

      <form action={updateRestaurantSettingsAction} encType="multipart/form-data" className="rounded-[2rem] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <input type="hidden" name="tenantId" value={tenant.id} />
        <fieldset disabled={!canEdit} className="space-y-5 disabled:opacity-60">
          <SectionCard eyebrow="Identidade" title="Dados públicos do restaurante" description="Informações que identificam o estabelecimento para o cliente e para a administração interna.">
            <RestaurantLogoInput currentLogoUrl={logoUrl} restaurantName={tenant.name} disabled={!canEdit} />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Nome fantasia" name="name" defaultValue={tenant.name} required hint="Nome exibido no painel e no cardápio público." />
              <Field label="Slug público" name="publicSlug" defaultValue={tenant.public_slug ?? ''} required placeholder="restaurante-exemplo" hint="Use letras, números e hífens. Ele compõe o link público do cardápio." />
              <Field label="Razão social" name="legalName" defaultValue={tenant.legal_name} />
              <Field label="Documento" name="document" defaultValue={tenant.document} />
              <Field label="E-mail" name="email" type="email" inputMode="email" defaultValue={tenant.email} />
              <Field label="Telefone" name="phone" inputMode="tel" defaultValue={tenant.phone} />
            </div>
            <div className="mt-4">
              <TextArea label="Descrição pública" name="publicDescription" defaultValue={settings?.public_description} maxLength={280} hint="Texto curto para apresentar o restaurante no cardápio." />
            </div>
          </SectionCard>

          <SectionCard eyebrow="Funcionamento" title="Pedidos por QR e operação" description="Defina se o restaurante recebe pedidos pelo QR, o status atual e o tempo médio de preparo.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="block">
                <span className="text-sm font-bold text-stone-800">Status operacional</span>
                <select name="operatingStatus" defaultValue={operatingStatus} className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-red-500 focus:bg-red-50/20">
                  <option value="open">Aberto</option>
                  <option value="paused">Pausado</option>
                  <option value="closed">Fechado</option>
                </select>
              </label>
              <Field label="Tempo médio de preparo (min)" name="estimatedPrepMinutes" type="number" inputMode="numeric" defaultValue={settings?.estimated_prep_minutes} placeholder="30" hint="Aceita valores de 1 a 240 minutos." />
              <Field label="Taxa de serviço (%)" name="serviceFeePercent" inputMode="decimal" defaultValue={serviceFeeValue(settings)} placeholder="10" hint="Pode usar vírgula. Ex.: 10,5." />
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-3xl border border-stone-200 bg-white p-4 text-sm text-stone-800">
              <input type="hidden" name="acceptsQrOrders" value="false" />
              <input type="checkbox" name="acceptsQrOrders" value="true" defaultChecked={settings?.accepts_qr_orders ?? false} className="mt-1 h-5 w-5 shrink-0 accent-red-500" />
              <span>
                <strong className="block text-stone-950">Aceitar pedidos pelo QR Code</strong>
                <span className="mt-1 block text-xs leading-5 text-stone-500">Quando desmarcado, o cardápio pode continuar visível, mas o recebimento de pedidos fica controlado pela regra operacional.</span>
              </span>
            </label>
          </SectionCard>

          <SectionCard eyebrow="Cliente" title="Endereço e mensagens do cardápio" description="Conteúdo visto pelo cliente no fluxo público do QR Code.">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Endereço" name="addressLine" defaultValue={settings?.address_line} />
              <Field label="Cidade" name="city" defaultValue={settings?.city} />
              <Field label="UF" name="state" defaultValue={settings?.state} placeholder="SP" hint="Use 2 letras." />
            </div>
            <div className="mt-4">
              <TextArea label="Mensagem pública no cardápio" name="publicNotice" defaultValue={settings?.public_notice} maxLength={220} rows={3} hint="Ex.: Tempo de preparo pode variar em horários de pico." />
            </div>
          </SectionCard>

          <div className="sticky bottom-24 z-10 rounded-3xl border border-stone-200 bg-white/95 p-3 shadow-xl shadow-stone-300/40 backdrop-blur md:static md:shadow-none">
            <button type="submit" className="min-h-12 w-full rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-600 md:w-auto">
              Salvar configurações
            </button>
          </div>
        </fieldset>
      </form>

      {!canEdit ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Seu papel atual permite visualizar, mas não editar as configurações. Apenas owner/admin podem salvar alterações.</p>
      ) : null}
    </section>
  );
}
