import { useEffect, useState } from 'react';
import { Section } from '../../components/shared/Section';
import { UserFacingErrorAlert } from '../../components/shared/UserFacingErrorAlert';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { useAuth } from './AuthContext';
import type { Profile } from './auth.model';

async function loadProfiles(): Promise<Profile[]> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('id, full_name, role, is_active')
    .order('created_at');
  if (error) throw new Error('تعذر تحميل حسابات الموظفات.');
  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    role: row.role === 'admin' ? 'admin' : 'staff',
    isActive: row.is_active,
  }));
}

async function saveProfileAccess(profile: Profile): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('profiles')
    .update({ role: profile.role, is_active: profile.isActive })
    .eq('id', profile.id);
  if (error) throw new Error('تعذر حفظ صلاحية الحساب.');
}

export function AccountManagement() {
  const { profile: current } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    void loadProfiles().then(setProfiles).catch(setError);
  }, []);

  const update = async (next: Profile) => {
    if (next.id === current?.id && (!next.isActive || next.role !== 'admin')) {
      setError('لا يمكنك تعطيل حساب المديرة المستخدم الآن أو إزالة صلاحية الإدارة منه.');
      return;
    }
    setSavingId(next.id);
    setError(null);
    try {
      await saveProfileAccess(next);
      setProfiles(await loadProfiles());
    } catch (reason) {
      setError(reason);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Section title="حسابات الموظفات" description="فعّلي الحسابات الموجودة وحددي مديرة أو موظفة. إنشاء حساب Auth جديد يتم من لوحة Supabase الموثوقة ثم يظهر هنا للتفعيل.">
      {error !== null && (
        <div className="mb-3 space-y-2">
          <UserFacingErrorAlert error={error} fallback="تعذر إدارة الحسابات." />
          <button type="button" onClick={() => { setError(null); void loadProfiles().then(setProfiles).catch(setError); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold">إعادة المحاولة</button>
        </div>
      )}
      {profiles.length === 0 ? <p className="text-sm text-slate-500">لا توجد حسابات أخرى ظاهرة.</p> : (
        <ul className="space-y-2">
          {profiles.map((profile) => (
            <li key={profile.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-3">
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{profile.fullName}</span>
              <select
                aria-label={`دور ${profile.fullName}`}
                value={profile.role}
                disabled={savingId === profile.id}
                onChange={(event) => void update({ ...profile, role: event.target.value as Profile['role'] })}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="staff">موظفة</option><option value="admin">مديرة</option>
              </select>
              <button
                type="button"
                disabled={savingId === profile.id}
                onClick={() => void update({ ...profile, isActive: !profile.isActive })}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold"
              >
                {profile.isActive ? 'تعطيل' : 'تفعيل'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
