import { CalendarClock, Gem, Shirt, ShoppingBag } from 'lucide-react';
import type { LandingProfile } from './types';
import { Reveal } from './Reveal';

const ICONS = [Shirt, ShoppingBag, Gem, CalendarClock];

/** The four things a visitor can do here, stated once, right under the hero. */
export function LandingValueStrip({ profile }: { profile: LandingProfile }) {
  return (
    <div id="services" className="relative z-10 mx-auto -mt-10 max-w-7xl scroll-mt-24 px-4 sm:px-6 lg:px-8">
      <Reveal>
        <div className="grid gap-3 rounded-[1.75rem] border border-slate-200/70 bg-white p-4 shadow-2xl shadow-slate-900/5 sm:grid-cols-2 lg:grid-cols-4">
          {profile.services.map((service, index) => {
            const Icon = ICONS[index % ICONS.length];
            return (
              <div
                key={service.title}
                className="flex items-start gap-3 rounded-2xl p-3 transition hover:bg-amber-50/60"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-900">{service.title}</span>
                  <span className="mt-1 block text-xs leading-6 text-slate-500">
                    {service.description}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </Reveal>
    </div>
  );
}
