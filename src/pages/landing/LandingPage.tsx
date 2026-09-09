import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import type { Dress } from '../../features/dresses/dress.types';
import { DRESS_CATEGORIES } from '../../shared/domain/dressConstants';
import { getShowroomProfile } from '../../features/preferences/showroomProfile.service';
import { landingShowroomProfile, type LandingShowroomProfile } from './landingContent';
import { loadLandingInventory } from './landingDress.repository';
import { loadPublicShowroomProfile } from './landingProfile.repository';
import { LandingAboutServices } from './components/LandingAboutServices';
import { LandingCategories } from './components/LandingCategories';
import { LandingContact } from './components/LandingContact';
import { LandingFaq } from './components/LandingFaq';
import { LandingFooter } from './components/LandingFooter';
import { LandingHeader } from './components/LandingHeader';
import { LandingHero } from './components/LandingHero';
import { LandingInventory } from './components/LandingInventory';
import { LandingSteps } from './components/LandingSteps';
import { LandingValueStrip } from './components/LandingValueStrip';
import type { InventoryCategoryFilter, LandingUsageFilter } from './components/types';
import { buildAppointmentInquiryMessage, buildLandingWhatsAppLink } from './landingWhatsapp';

const inventoryCategories = ['all', ...DRESS_CATEGORIES] as const;

/**
 * The showroom profile is itself read from local storage (see
 * showroomProfile.service.ts). A corrupted or unavailable storage entry must
 * not crash the whole public page — the static content defaults are always a
 * safe fallback.
 */
function getShowroomProfileSafely(): LandingShowroomProfile {
  try {
    return getShowroomProfile();
  } catch {
    return { ...landingShowroomProfile };
  }
}

export function LandingPage() {
  const [dresses, setDresses] = useState<Dress[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategoryFilter>('all');
  const [usageFilter, setUsageFilter] = useState<LandingUsageFilter>('all');
  const [profile, setProfile] = useState<LandingShowroomProfile>(() => getShowroomProfileSafely());

  useEffect(() => {
    let cancelled = false;
    void loadPublicShowroomProfile()
      .then((loaded) => { if (!cancelled) setProfile(loaded); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await loadLandingInventory();
        if (cancelled) return;
        setDresses(result.dresses);
        setLoadError(result.warning ?? null);
      } catch {
        if (cancelled) return;
        setDresses([]);
        setLoadError('تعذر تحميل المعروض الحالي. جرّبي تحديث الصفحة أو تواصلي معنا مباشرة.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  const filteredDresses = useMemo(() => {
    return dresses.filter((dress) => {
      const matchesCategory = selectedCategory === 'all' || dress.category === selectedCategory;
      const matchesUsage = usageFilter === 'all'
        || (usageFilter === 'rent' && dress.isForRent)
        || (usageFilter === 'sale' && dress.isForSale);
      const normalizedSearch = search.trim().toLowerCase();
      const matchesSearch = normalizedSearch.length === 0
        || [dress.name, dress.category, dress.color, dress.size]
          .some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesCategory && matchesUsage && matchesSearch;
    });
  }, [dresses, search, selectedCategory, usageFilter]);

  /** A category tile filters the catalogue and walks the visitor down to it. */
  const selectCategory = useCallback((category: string) => {
    setSelectedCategory(
      (inventoryCategories as readonly string[]).includes(category)
        ? (category as InventoryCategoryFilter)
        : 'all',
    );
    setSearch('');
    document.getElementById('available-dresses')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const rentableCount = dresses.filter((dress) => dress.isForRent).length;
  const saleCount = dresses.filter((dress) => dress.isForSale).length;
  const appointmentLink = buildLandingWhatsAppLink(profile, buildAppointmentInquiryMessage());

  return (
    <div className="min-h-screen bg-[#faf8f4] text-slate-900" dir="rtl">
      <LandingHeader profile={profile} />

      <main>
        <LandingHero
          profile={profile}
          dresses={dresses}
          rentableCount={rentableCount}
          saleCount={saleCount}
        />
        <LandingValueStrip profile={profile} />

        <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <LandingCategories
            profile={profile}
            dresses={dresses}
            onSelectCategory={selectCategory}
          />
          <LandingInventory
            profile={profile}
            dresses={filteredDresses}
            loading={loading}
            loadError={loadError}
            search={search}
            onSearchChange={setSearch}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            usageFilter={usageFilter}
            onUsageChange={setUsageFilter}
            inventoryCategories={inventoryCategories}
          />
          <LandingAboutServices profile={profile} dresses={dresses} />
          <LandingSteps profile={profile} />
          <LandingFaq profile={profile} />
          <LandingContact profile={profile} />
        </div>
      </main>

      <LandingFooter profile={profile} />

      {appointmentLink ? (
        <a
          href={appointmentLink}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-amber-300 to-amber-500 px-5 text-sm font-black text-slate-950 shadow-2xl shadow-amber-900/30 lg:hidden"
        >
          <MessageCircle aria-hidden="true" className="h-4 w-4" />
          احجزي موعد عبر واتساب
        </a>
      ) : null}
    </div>
  );
}
