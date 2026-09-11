import type { Dress } from '../../../features/dresses/dress.types';
import type { LandingProfile } from './types';
import { DressPhoto } from './DressPhoto';
import type { GroupedDress } from '../LandingPage';

type Props = {
  profile: LandingProfile;
  dresses: Dress[];
  groupedDresses?: GroupedDress[];
  onSelectCategory: (category: string) => void;
};

type CategorySourceItem = {
  category: string;
  name: string;
  images: string[];
};

export function LandingCategories({ profile, dresses, groupedDresses, onSelectCategory }: Props) {
  const source: CategorySourceItem[] = groupedDresses
    ? groupedDresses.map((g) => ({ category: g.category, name: g.name, images: g.images }))
    : dresses.map((d) => ({ category: d.category, name: d.name, images: d.images }));

  const categories = profile.categories.map((category) => {
    const matching = source.filter((item) => item.category === category.name);
    const matchingDresses = dresses.filter((d) => d.category === category.name);
    const photo = matchingDresses.find((d) => d.images[0])?.images[0] ?? matching.find((item) => item.images[0])?.images[0];
    const designCount = groupedDresses ? matching.length : matchingDresses.length;
    return {
      ...category,
      designCount,
      photo,
      hasStock: matching.length > 0,
    };
  });

  return (
    <section id="categories" className="bg-[#FFFCF8] py-8 sm:py-10">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-8 lg:px-10">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[11px] font-medium tracking-[0.14em] text-black/60">الفئات</h2>
          <button type="button" onClick={() => onSelectCategory('all')} className="text-[11px] text-black/40 hover:text-black">الكل →</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-px bg-[#E8E2D9] p-px sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((cat) => (
            <button key={cat.name} type="button" onClick={() => onSelectCategory(cat.name)} className="group relative aspect-[4/5] overflow-hidden bg-[#F5F1EB] text-right">
              <DressPhoto brand={profile.brandName} src={cat.photo} alt={cat.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" fallbackLabel={cat.name} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-2.5">
                <p className="text-[12px] font-medium text-white leading-none">{cat.name}</p>
                <p className="mt-1 text-[10px] text-white/60">{cat.hasStock ? `${cat.designCount} تصميم` : '—'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
