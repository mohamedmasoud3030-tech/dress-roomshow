import { formatMoneyOMR } from '../../../shared/utils/format';
import type { LandingProfile } from './types';
import { DressPhoto } from './DressPhoto';
import type { GroupedDress } from '../LandingPage';

export function LandingNewArrivals({
  profile,
  dresses,
  onSelect,
}: {
  profile: LandingProfile;
  dresses: GroupedDress[];
  onSelect: (dress: any) => void;
}) {
  if (dresses.length === 0) return null;

  return (
    <section id="new-arrivals" className="bg-white py-8 sm:py-10">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-8 lg:px-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[11px] font-medium tracking-[0.14em] text-black/60">وصل حديثاً</h2>
          <span className="text-[10px] text-black/30">← اسحبي</span>
        </div>

        <div className="mt-4 flex gap-px overflow-x-auto bg-[#E8E2D9] p-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {dresses.map((group) => (
            <button key={group.key} type="button" onClick={() => onSelect(group.firstDress)} className="group flex w-[44%] shrink-0 flex-col bg-[#FFFCF8] text-right sm:w-[22%] lg:w-[16%]">
              <div className="aspect-[3/4] overflow-hidden bg-[#F5F1EB]">
                <DressPhoto brand={profile.brandName} src={group.images[0]} alt={group.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" fallbackLabel={group.category} />
              </div>
              <div className="p-2.5">
                <p className="truncate text-[11px] font-medium text-black leading-tight">{group.name}</p>
                <p className="mt-1 text-[10px] text-black/50">{group.sizes.length > 1 ? `${group.sizes.length} مقاسات` : `مقاس ${group.sizes[0]}`} · {group.colors.length > 1 ? `${group.colors.length} ألوان` : group.colors[0]}</p>
                <p className="mt-1 text-[11px] text-black/70">{group.isForRent ? formatMoneyOMR(group.firstDress.rentalPrice) : formatMoneyOMR(group.firstDress.salePrice)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
