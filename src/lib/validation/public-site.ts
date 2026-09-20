export type PublicSiteInput = {
  displayName: string;
  publicSlug: string;
  headline: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  addressLine: string | null;
  isPublished: boolean;
  showMenu: boolean;
  acceptsReservations: boolean;
  acceptsOnlineOrders: boolean;
};

export type PublicSiteValidationResult =
  | { ok: true; data: PublicSiteInput }
  | { ok: false; message: string };

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function optionalText(value: unknown, maxLength: number, label: string): { ok: true; value: string | null } | { ok: false; message: string } {
  const cleaned = cleanText(value);
  if (!cleaned) return { ok: true, value: null };
  if (cleaned.length > maxLength) return { ok: false, message: `${label} deve ter no máximo ${maxLength} caracteres.` };
  return { ok: true, value: cleaned };
}

function optionalUrlOrHandle(value: unknown, maxLength: number, label: string): { ok: true; value: string | null } | { ok: false; message: string } {
  const checked = optionalText(value, maxLength, label);
  if (!checked.ok || !checked.value) return checked;
  if (/^(https?:\/\/|@|[+()\d\s-])/.test(checked.value)) return checked;
  return { ok: false, message: `${label} deve ser um link, telefone ou @perfil válido.` };
}

export function normalizeSiteSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function booleanFlag(value: unknown): boolean {
  return value === true || value === 'true' || value === 'on' || value === '1';
}

export function validatePublicSiteInput(input: Record<string, unknown>): PublicSiteValidationResult {
  const displayName = cleanText(input.displayName);
  if (displayName.length < 3 || displayName.length > 120) {
    return { ok: false, message: 'Nome público deve ter entre 3 e 120 caracteres.' };
  }

  const publicSlug = normalizeSiteSlug(cleanText(input.publicSlug) || displayName);
  if (publicSlug.length < 3 || publicSlug.length > 80 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(publicSlug)) {
    return { ok: false, message: 'Informe um slug público válido entre 3 e 80 caracteres.' };
  }

  const headline = optionalText(input.headline, 140, 'Chamada principal');
  if (headline.ok === false) return { ok: false, message: headline.message };
  const description = optionalText(input.description, 1000, 'Descrição do site');
  if (description.ok === false) return { ok: false, message: description.message };
  const phone = optionalText(input.phone, 40, 'Telefone');
  if (phone.ok === false) return { ok: false, message: phone.message };
  const whatsapp = optionalUrlOrHandle(input.whatsapp, 120, 'WhatsApp');
  if (whatsapp.ok === false) return { ok: false, message: whatsapp.message };
  const instagram = optionalUrlOrHandle(input.instagram, 120, 'Instagram');
  if (instagram.ok === false) return { ok: false, message: instagram.message };
  const addressLine = optionalText(input.addressLine, 180, 'Endereço');
  if (addressLine.ok === false) return { ok: false, message: addressLine.message };

  return {
    ok: true,
    data: {
      displayName,
      publicSlug,
      headline: headline.value,
      description: description.value,
      phone: phone.value,
      whatsapp: whatsapp.value,
      instagram: instagram.value,
      addressLine: addressLine.value,
      isPublished: booleanFlag(input.isPublished),
      showMenu: input.showMenu !== false && input.showMenu !== 'false',
      acceptsReservations: booleanFlag(input.acceptsReservations),
      acceptsOnlineOrders: booleanFlag(input.acceptsOnlineOrders),
    },
  };
}
