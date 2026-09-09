import { ArrowUpLeft } from 'lucide-react';
import type { Dress } from '../../../features/dresses/dress.types';
import type { LandingProfile } from './types';
import { DressPhoto } from './DressPhoto';
import { Reveal } from './Reveal';

/**
 * A social strip built from the showroom's own photography.
 *
 * There is no Instagram API token in this app, so the grid shows real pieces
 * from the catalogue and the call to action opens the published profile — no
 * fake feed and no embedded third-party script that could break the page.
 */
export function LandingInstagram({ profile, dresses }: { profile: LandingProfile; dresses: Dress[] }) {
  const handle = profile.contact.instagram.replace(/^@/, '');
  const tiles = dresses.filter((dress) => dress.images[0]).slice(0, 6);
  if (tiles.length === 0 || !handle) return null;

  return (
    <section className="mt-24 sm:mt-32">
      <Reveal>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-amber-600">
              تابعينا على إنستجرام
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              إطلالات حقيقية من المعرض
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              صور القطع كما هي في المعرض، بتحديث مستمر.
            </p>
          </div>
          <a
            href={`https://instagram.com/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-800 transition hover:border-slate-900 sm:self-auto"
          >
            @{handle}
            <ArrowUpLeft aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
      </Reveal>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((dress, index) => (
          <Reveal key={dress.id} delay={index * 60}>
            <a
              href={`https://instagram.com/${handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block overflow-hidden rounded-2xl"
              aria-label={`تابعينا على إنستجرام — ${dress.name}`}
            >
              <DressPhoto
            brand={profile.brandName}
                src={dress.images[0]}
                alt={dress.name}
                className="aspect-square w-full transition duration-[900ms] group-hover:scale-110"
                fallbackLabel={dress.category}
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-slate-950/0 transition duration-300 group-hover:bg-slate-950/45"
              />
              <span className="absolute inset-x-0 bottom-0 translate-y-full p-3 text-[0.7rem] font-black text-white transition duration-300 group-hover:translate-y-0">
                {dress.name}
              </span>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
