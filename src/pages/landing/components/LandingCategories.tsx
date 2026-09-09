import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import type { Dress } from '../../../features/dresses/dress.types';
import type { LandingProfile } from './types';
import { DressPhoto } from './DressPhoto';
import { Reveal } from './Reveal';

type Props = {
  profile: LandingProfile;
  dresses: Dress[];
  onSelectCategory: (category: string) => void;
};

/** Visual entry points into the catalogue, each backed by a real piece. */
export function LandingCategories({ profile, dresses, onSelectCategory }: Props) {
  const categories = profile.categories.map((category) => {
    const matching = dresses.filter((dress) => dress.category === category.name);
    return {
      ...category,
      count: matching.length,
      photo: matching.find((dress) => dress.images[0])?.images[0],
      hasStock: matching.length > 0,
    };
  });

  return (
    <section id="categories" className="mt-20 scroll-mt-24 sm:mt-24">
      <Reveal>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-amber-600">التشكيلة</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              تصفّحي حسب المناسبة
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              فساتين زفاف وخطوبة وسهرة، وما يكملها من إكسسوارات وحقائب وأحذية وطرح — كل قطعة
              معروضة بصورتها الحقيقية.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => onSelectCategory('all')} className="self-start border-slate-300 px-4 py-2.5 text-sm font-black hover:border-slate-900 hover:text-slate-950 sm:self-auto">
            عرض كل المعروض
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </Reveal>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {categories.map((category, index) => (
          <Reveal key={category.name} delay={index * 60}>
            <Button
              type="button"
              variant="quiet"
              onClick={() => onSelectCategory(category.name)}
              className="group relative block w-full overflow-hidden rounded-[1.5rem] p-0 text-right focus-visible:ring-4 focus-visible:ring-amber-400/50"
              aria-label={`عرض قطع فئة ${category.name}`}
            >
              <span className="relative block aspect-[4/5] overflow-hidden bg-slate-100">
                <DressPhoto
            brand={profile.brandName}
                  src={category.photo}
                  alt={`قطع فئة ${category.name}`}
                  className="h-full w-full transition duration-[900ms] group-hover:scale-110"
                  fallbackLabel={category.name}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent"
                />
                <span className="absolute inset-x-0 bottom-0 p-4">
                  <span className="block text-base font-black text-white sm:text-lg">
                    {category.name}
                  </span>
                  <span className="mt-1 block text-[0.7rem] leading-5 text-slate-300">
                    {category.hasStock ? `${category.count} قطعة معروضة` : 'تتوفر قريباً'}
                  </span>
                </span>
                {category.hasStock ? (
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[0.65rem] font-black text-slate-900">
                    متاح
                  </span>
                ) : null}
              </span>
            </Button>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
