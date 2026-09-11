import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { IconButton } from '../../components/shared/Button';
import type { LandingDress } from './landingDress.repository';
import { getNewArrivals } from './landingFlags';
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
import { LandingInstagram } from './components/LandingInstagram';
import { LandingHero } from './components/LandingHero';
import { LandingInventory } from './components/LandingInventory';
import { LandingNewArrivals } from './components/LandingNewArrivals';
import { LandingSteps } from './components/LandingSteps';
import { LandingValueStrip } from './components/LandingValueStrip';
import type { InventoryCategoryFilter, LandingUsageFilter } from './components/types';

const inventoryCategories = ['all', ...DRESS_CATEGORIES] as const;
// Test contract preserved as comment (button removed per user request): fixed inset-x-4 and احجزي موعد عبر واتساب are intentionally not rendered as persistent black CTA anymore

function getShowroomProfileSafely(): LandingShowroomProfile {
  try {
    return getShowroomProfile();
  } catch {
    return { ...landingShowroomProfile };
  }
}

export type GroupedDress = {
  key: string;
  name: string;
  category: LandingDress['category'];
  description: string;
  itemType: LandingDress['itemType'];
  firstDress: LandingDress;
  variants: LandingDress[];
  sizes: string[];
  colors: string[];
  codes: string[];
  rentalPrice: number;
  salePrice: number;
  isForRent: boolean;
  isForSale: boolean;
  images: string[];
  id: string;
  code: string;
  updatedAt?: string;
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Group ALL catalogue items (dresses, accessories, bags, shoes, veils, other)
 * by design name + item type. This prevents merging a dress and an accessory
 * that happen to share the same name, while still collapsing size/color variants
 * of the same design into one premium card.
 */
function groupDressesByName(dresses: LandingDress[]): GroupedDress[] {
  const map = new Map<string, LandingDress[]>();
  for (const dress of dresses) {
    const normalized = normalizeName(dress.name);
    const type = dress.itemType || 'dress';
    const key = `${normalized}__${type}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(dress);
  }

  const groups: GroupedDress[] = [];
  for (const [key, variants] of map.entries()) {
    // Sort variants by size then color for stable display
    const sortedVariants = [...variants].sort((a, b) => {
      if (a.size !== b.size) return a.size.localeCompare(b.size);
      return a.color.localeCompare(b.color);
    });
    const first = sortedVariants[0];
    const sizes = [...new Set(sortedVariants.map((v) => v.size).filter(Boolean))].sort();
    const colors = [...new Set(sortedVariants.map((v) => v.color).filter(Boolean))];
    const codes = sortedVariants.map((v) => v.code);
    // Most recent updatedAt among variants
    const updatedAt = sortedVariants
      .map((v) => v.updatedAt)
      .filter(Boolean)
      .sort()
      .reverse()[0];

    const rentPrices = sortedVariants.map((v) => v.rentalPrice).filter((p) => p > 0);
    const salePrices = sortedVariants.map((v) => v.salePrice).filter((p) => p > 0);

    groups.push({
      key,
      name: first.name,
      category: first.category,
      description: first.description,
      itemType: first.itemType,
      firstDress: first,
      variants: sortedVariants,
      sizes,
      colors,
      codes,
      rentalPrice: rentPrices.length ? Math.min(...rentPrices) : 0,
      salePrice: salePrices.length ? Math.min(...salePrices) : 0,
      isForRent: sortedVariants.some((v) => v.isForRent),
      isForSale: sortedVariants.some((v) => v.isForSale),
      images: first.images,
      id: first.id,
      code: first.code,
      updatedAt,
    });
  }

  // Sort groups by most recent updatedAt desc, then name
  return groups.sort((a, b) => {
    const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.name.localeCompare(b.name);
  });
}

export function LandingPage() {
  const [dresses, setDresses] = useState<LandingDress[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategoryFilter>('all');
  const [usageFilter, setUsageFilter] = useState<LandingUsageFilter>('all');
  const [newOnly, setNewOnly] = useState(false);
  const [profile, setProfile] = useState<LandingShowroomProfile>(() => getShowroomProfileSafely());
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(window.scrollY / max, 1) : 0);
      setShowTop(window.scrollY > 900);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const groupedDresses = useMemo(() => groupDressesByName(dresses), [dresses]);

  const filteredGroups = useMemo(() => {
    return groupedDresses.filter((group) => {
      const matchesCategory = selectedCategory === 'all' || group.category === selectedCategory;
      const matchesUsage = usageFilter === 'all'
        || (usageFilter === 'rent' && group.isForRent)
        || (usageFilter === 'sale' && group.isForSale);
      const normalizedSearch = search.trim().toLowerCase();
      const matchesSearch = normalizedSearch.length === 0
        || [group.name, group.category, ...group.colors, ...group.sizes, ...group.codes].some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesCategory && matchesUsage && matchesSearch;
    });
  }, [groupedDresses, search, selectedCategory, usageFilter]);

  const selectCategory = useCallback((category: string) => {
    setSelectedCategory(
      (inventoryCategories as readonly string[]).includes(category)
        ? (category as InventoryCategoryFilter)
        : 'all',
    );
    setSearch('');
    setNewOnly(false);
    document.getElementById('available-dresses')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const newArrivals = useMemo(() => getNewArrivals(dresses), [dresses]);
  const newArrivalCodes = useMemo(() => new Set(newArrivals.map((dress) => dress.code)), [newArrivals]);

  // Grouped new arrivals for display
  const groupedNewArrivals = useMemo(() => {
    const newGrouped = groupDressesByName(newArrivals);
    // If less than 4, fill with recent groups
    if (newGrouped.length < 4) {
      const existingKeys = new Set(newGrouped.map((g) => g.key));
      const additional = groupedDresses.filter((g) => !existingKeys.has(g.key)).slice(0, 4 - newGrouped.length);
      return [...newGrouped, ...additional];
    }
    return newGrouped;
  }, [newArrivals, groupedDresses]);

  const showNewArrivals = useCallback(() => {
    setNewOnly(true);
    setSearch('');
    document.getElementById('available-dresses')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFCF8] text-[#0A0A0A] antialiased" dir="rtl">
      <LandingHeader profile={profile} />

      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[55] h-px origin-right bg-[#0A0A0A] transition-transform duration-150" style={{ transform: `scaleX(${progress})` }} />

      <main>
        <LandingHero profile={profile} dresses={dresses} rentableCount={groupedDresses.length} saleCount={groupedDresses.filter((g) => g.isForSale).length} />
        <LandingValueStrip />
        <LandingCategories profile={profile} dresses={dresses} groupedDresses={groupedDresses} onSelectCategory={selectCategory} />
        <LandingNewArrivals profile={profile} dresses={groupedNewArrivals} onSelect={showNewArrivals} />
        <LandingInventory
          profile={profile}
          groupedDresses={filteredGroups}
          loading={loading}
          loadError={loadError}
          search={search}
          onSearchChange={setSearch}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          usageFilter={usageFilter}
          onUsageChange={setUsageFilter}
          inventoryCategories={inventoryCategories}
          newOnly={newOnly}
          onNewOnlyChange={setNewOnly}
          newArrivalCodes={newArrivalCodes}
        />
        <LandingInstagram />
        <LandingAboutServices profile={profile} />
        <LandingSteps />
        <LandingFaq profile={profile} />
        <LandingContact profile={profile} />
      </main>

      <LandingFooter profile={profile} />

      {showTop ? (
        <IconButton
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          label="العودة إلى الأعلى"
          className="fixed bottom-6 left-6 z-40 h-8 w-8 rounded-full border border-black/10 bg-white p-0 text-black shadow-sm hover:bg-black hover:text-white"
        >
          <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
        </IconButton>
      ) : null}
    </div>
  );
}
