import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabaseClient';
import type { Profile } from './auth.model';

/**
 * Real access control for the showroom operators.
 *
 * The showroom previously had no server, so "who is using the app" was just
 * an attributed display name (`operator.service.ts`) with no gate at all —
 * documented in the app itself as deliberately not authentication. Now that
 * data lives in Supabase, an unauthenticated visitor with the public anon
 * key could otherwise read and write every customer, reservation and
 * payment. This is the real login that closes that gap; the operator name is
 * kept as a separate, lighter-weight attribution layer on top of it (see
 * `operator.service.ts`).
 */

export class AuthError extends Error {}

export function toFriendlyAuthMessage(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  }
  if (message.includes('Email not confirmed')) {
    return 'يجب تأكيد البريد الإلكتروني أولاً.';
  }
  if (message.toLowerCase().includes('network')) {
    return 'تعذر الاتصال بالخادم. تحققي من الإنترنت وحاولي مجدداً.';
  }
  if (message.toLowerCase().includes('rate limit')) {
    return 'تمت محاولات دخول كثيرة. انتظري قليلاً ثم حاولي مجدداً.';
  }
  if (message.toLowerCase().includes('weak password')) {
    return 'كلمة المرور لم تعد مطابقة لمتطلبات الأمان. أعيدي تعيينها أولاً.';
  }
  return 'تعذر تسجيل الدخول. حاولي مجدداً.';
}

export async function signIn(email: string, password: string): Promise<Session> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) throw new AuthError('البريد الإلكتروني مطلوب.');
  if (!password) throw new AuthError('كلمة المرور مطلوبة.');

  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (error) throw new AuthError(toFriendlyAuthMessage(error.message));
  if (!data.session) throw new AuthError('تعذر تسجيل الدخول. حاولي مجدداً.');
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw new AuthError('تعذر تسجيل الخروج. حاولي مجدداً.');
}

export async function signUp(email: string, password: string, fullName: string): Promise<Session | null> {
  const trimmedEmail = email.trim();
  const trimmedName = fullName.trim();
  if (!trimmedEmail) throw new AuthError('البريد الإلكتروني مطلوب.');
  if (!password || password.length < 6) throw new AuthError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
  if (!trimmedName) throw new AuthError('الاسم الكامل مطلوب.');

  const { data, error } = await getSupabaseClient().auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: { full_name: trimmedName },
    },
  });

  if (error) throw new AuthError(toFriendlyAuthMessage(error.message));
  // Supabase may require email confirmation; session may be null
  return data.session ?? null;
}

export async function claimFirstOwner(): Promise<Profile> {
  const { data, error } = await getSupabaseClient().rpc('claim_first_owner');
  if (error) {
    if (error.message.includes('LENA_OWNER_ALREADY_BOOTSTRAPPED')) {
      throw new AuthError('يوجد مديرة فعالة بالفعل. لا يمكن تأسيس حساب جديد كمديرة.');
    }
    if (error.message.includes('LENA_NOT_AUTHENTICATED')) {
      throw new AuthError('يجب تسجيل الدخول أولاً.');
    }
    throw new AuthError(toFriendlyAuthMessage(error.message));
  }
  const row = data as { id: string; full_name: string; role: string; is_active: boolean } | null;
  if (!row) throw new AuthError('تعذر تأسيس حساب المديرة.');
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role === 'admin' ? 'admin' : 'staff',
    isActive: row.is_active,
  };
}

export async function isFirstOwnerSetupNeeded(): Promise<boolean> {
  try {
    const { data, error } = await getSupabaseClient().rpc('is_first_owner_setup_needed');
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) throw new AuthError('اكتبي البريد الإلكتروني أولاً لإرسال رابط الاستعادة.');
  const redirectTo = typeof window === 'undefined' ? undefined : `${window.location.origin}/login`;
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
  if (error) throw new AuthError(toFriendlyAuthMessage(error.message));
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw new AuthError(error.message);
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const {
    data: { subscription },
  } = getSupabaseClient().auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}

function mapProfileRow(row: {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
}): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role === 'admin' ? 'admin' : 'staff',
    isActive: row.is_active,
  };
}

export async function fetchProfile(user: User): Promise<Profile | null> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('id, full_name, role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw new AuthError('تعذر تحميل بيانات المستخدم.');
  return data ? mapProfileRow(data) : null;
}
