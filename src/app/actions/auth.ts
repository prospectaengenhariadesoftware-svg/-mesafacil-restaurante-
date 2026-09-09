'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { normalizeEmail, validateEmail, validatePassword, validatePersonName, validateTenantName } from '@/lib/validation/auth';

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function fail(path: string, message: string): never {
  redirect(`${path}?erro=${encodeURIComponent(message)}`);
}

export async function signUpAction(formData: FormData) {
  const name = getString(formData, 'name');
  const email = normalizeEmail(getString(formData, 'email'));
  const password = getString(formData, 'password');

  const nameValidation = validatePersonName(name);
  if (!nameValidation.ok) fail('/cadastro', nameValidation.message);
  const emailValidation = validateEmail(email);
  if (!emailValidation.ok) fail('/cadastro', emailValidation.message);
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.ok) fail('/cadastro', passwordValidation.message);

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) fail('/cadastro', error.message);

  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) redirect('/login?mensagem=Cadastro criado. Confirme o e-mail se solicitado e faça login.');

  await supabase.rpc('create_profile_for_current_user', { profile_name: name, profile_phone: null });
  redirect('/onboarding/restaurante');
}

export async function signInAction(formData: FormData) {
  const email = normalizeEmail(getString(formData, 'email'));
  const password = getString(formData, 'password');
  const next = getString(formData, 'next') || '/dashboard';

  const emailValidation = validateEmail(email);
  if (!emailValidation.ok) fail('/login', emailValidation.message);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) fail('/login', 'E-mail ou senha inválidos.');

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('status').eq('user_id', user.id).maybeSingle();
    if (profile?.status === 'disabled' || profile?.status === 'deleted') {
      await supabase.auth.signOut();
      fail('/login', 'Usuário desativado.');
    }
  }

  redirect(next.startsWith('/') ? next : '/dashboard');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function resetPasswordRequestAction(formData: FormData) {
  const email = normalizeEmail(getString(formData, 'email'));
  const emailValidation = validateEmail(email);
  if (!emailValidation.ok) fail('/esqueci-senha', emailValidation.message);

  const headersList = await headers();
  const origin = headersList.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/redefinir-senha`,
  });

  if (error) fail('/esqueci-senha', error.message);
  redirect('/esqueci-senha?mensagem=Se o e-mail existir, enviaremos um link de redefinição.');
}

export async function updatePasswordAction(formData: FormData) {
  const password = getString(formData, 'password');
  const validation = validatePassword(password);
  if (!validation.ok) fail('/redefinir-senha', validation.message);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) fail('/redefinir-senha', 'Sessão inválida ou expirada. Solicite um novo link.');
  redirect('/dashboard');
}

export async function createTenantAction(formData: FormData) {
  const name = getString(formData, 'name');
  const legalName = getString(formData, 'legal_name');
  const document = getString(formData, 'document');
  const email = normalizeEmail(getString(formData, 'email'));
  const phone = getString(formData, 'phone');

  const nameValidation = validateTenantName(name);
  if (!nameValidation.ok) fail('/onboarding/restaurante', nameValidation.message);
  if (email) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.ok) fail('/onboarding/restaurante', emailValidation.message);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const profileName = typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim().length >= 2
    ? user.user_metadata.name.trim()
    : user.email?.split('@')[0] ?? 'Usuário MesaFácil';

  await supabase.rpc('create_profile_for_current_user', {
    profile_name: profileName,
    profile_phone: null,
  });

  const { data, error } = await supabase.rpc('create_tenant_for_current_user', {
    tenant_name: name,
    tenant_legal_name: legalName || null,
    tenant_document: document || null,
    tenant_email: email || null,
    tenant_phone: phone || null,
  });

  if (error || !data) fail('/onboarding/restaurante', error?.message ?? 'Não foi possível criar o restaurante.');
  redirect(`/tenants/${data}`);
}
