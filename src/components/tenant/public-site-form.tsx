import { updatePublicSiteAction } from '@/app/actions/public-site';
import type { TenantRole } from '@/lib/types/saas';
import type { TenantPublicProfile } from '@/lib/types/public-site';

type Props = Readonly<{
  tenantId: string;
  tenantName: string;
  tenantSlug: string | null | undefined;
  profile: TenantPublicProfile | null;
  role: TenantRole;
}>;

type FieldProps = Readonly<{
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}>;

function Field({ label, name, defaultValue, required = false, placeholder, hint }: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-stone-800">{label}</span>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-red-500 focus:bg-red-50/20"
      />
      {hint ? <span className="mt-1 block text-xs leading-5 text-stone-500">{hint}</span> : null}
    </label>
  );
}

function TextArea({ label, name, defaultValue, maxLength, rows = 4, hint }: Readonly<{ label: string; name: string; defaultValue?: string | null; maxLength: number; rows?: number; hint?: string }>) {
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

function Toggle({ name, label, hint, defaultChecked }: Readonly<{ name: string; label: string; hint: string; defaultChecked: boolean }>) {
  return (
    <label className="flex items-start gap-3 rounded-3xl border border-stone-200 bg-white p-4 text-sm text-stone-800">
      <input type="hidden" name={name} value="false" />
      <input type="checkbox" name={name} value="true" defaultChecked={defaultChecked} className="mt-1 h-5 w-5 shrink-0 accent-red-500" />
      <span>
        <strong className="block text-stone-950">{label}</strong>
        <span className="mt-1 block text-xs leading-5 text-stone-500">{hint}</span>
      </span>
    </label>
  );
}

function slugFallback(value: string | null | undefined, tenantName: string) {
  return value ?? tenantName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function PublicSiteForm({ tenantId, tenantName, tenantSlug, profile, role }: Props) {
  const canEdit = role === 'owner' || role === 'admin';
  const slug = profile?.public_slug ?? slugFallback(tenantSlug, tenantName);
  const publicUrl = `/r/${slug}`;

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-stone-950 via-red-800 to-red-600 p-5 text-white sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/80">Site público</p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">{profile?.display_name ?? tenantName}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">Página comercial simples para o cliente conhecer o restaurante antes de escanear uma mesa.</p>
            </div>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="w-fit rounded-full border border-white/30 bg-white px-4 py-2 text-xs font-black text-red-700 shadow-sm">
              Abrir {publicUrl}
            </a>
          </div>
        </div>
        <div className="grid gap-3 p-5 text-sm md:grid-cols-3">
          <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4"><strong className="block text-stone-950">{profile?.is_published ? 'Publicado' : 'Rascunho'}</strong><span className="text-stone-500">Visibilidade da página</span></div>
          <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4"><strong className="block text-stone-950">{profile?.show_menu ?? true ? 'Cardápio visível' : 'Cardápio oculto'}</strong><span className="text-stone-500">Produtos disponíveis</span></div>
          <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4"><strong className="block text-stone-950">{canEdit ? 'owner/admin' : 'bloqueado'}</strong><span className="text-stone-500">Permissão de edição</span></div>
        </div>
      </div>

      <form action={updatePublicSiteAction} className="rounded-[2rem] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <input type="hidden" name="tenantId" value={tenantId} />
        <fieldset disabled={!canEdit} className="space-y-5 disabled:opacity-60">
          <section className="rounded-3xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-700">Identidade pública</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Nome exibido" name="displayName" required defaultValue={profile?.display_name ?? tenantName} />
              <Field label="Slug do site" name="publicSlug" required defaultValue={slug} hint="Forma o link público /r/slug." />
              <Field label="Chamada principal" name="headline" defaultValue={profile?.headline} placeholder="Comida de verdade, pedido fácil." />
              <Field label="Telefone" name="phone" defaultValue={profile?.phone} />
            </div>
            <div className="mt-4">
              <TextArea label="Descrição" name="description" maxLength={1000} defaultValue={profile?.description} hint="Até 1000 caracteres para apresentar o restaurante." />
            </div>
          </section>

          <section className="rounded-3xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-700">Contato e conversão</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Field label="WhatsApp" name="whatsapp" defaultValue={profile?.whatsapp} placeholder="https://wa.me/55..." />
              <Field label="Instagram" name="instagram" defaultValue={profile?.instagram} placeholder="@restaurante" />
              <Field label="Endereço" name="addressLine" defaultValue={profile?.address_line} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Toggle name="isPublished" label="Publicar site" hint="Quando desmarcado, /r/slug retorna página não encontrada." defaultChecked={profile?.is_published ?? false} />
              <Toggle name="showMenu" label="Mostrar cardápio básico" hint="Exibe categorias e produtos disponíveis do tenant atual." defaultChecked={profile?.show_menu ?? true} />
              <Toggle name="acceptsReservations" label="Aceitar reservas públicas" hint="Mostra formulário público de reserva, coleta nome/e-mail/telefone do cliente e marca a mesa como reservada no painel de Mesas." defaultChecked={profile?.accepts_reservations ?? false} />
              <Toggle name="acceptsOnlineOrders" label="Sinalizar pedidos online" hint="Indica intenção comercial; pedidos reais continuam pelo QR da mesa." defaultChecked={profile?.accepts_online_orders ?? false} />
            </div>
          </section>

          <div className="sticky bottom-24 z-10 rounded-3xl border border-stone-200 bg-white/95 p-3 shadow-xl shadow-stone-300/40 backdrop-blur md:static md:shadow-none">
            <button type="submit" className="min-h-12 w-full rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-600 md:w-auto">
              Salvar site público
            </button>
          </div>
        </fieldset>
      </form>

      {!canEdit ? <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Seu papel atual permite visualizar, mas não editar. Apenas owner/admin podem salvar alterações.</p> : null}
    </section>
  );
}
