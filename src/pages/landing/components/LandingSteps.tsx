import type { LandingProfile } from './types';
import { Reveal } from './Reveal';

/** How a visit works, on a dark band that breaks up the cream page. */
export function LandingSteps({ profile }: { profile: LandingProfile }) {
  return (
    <section className="mt-24 sm:mt-32">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0b0b12] px-6 py-14 text-white sm:px-10 lg:px-14">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-500/15 blur-[100px]" />
            <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-amber-400/10 blur-[100px]" />
          </div>

          <div className="relative">
            <p className="text-xs font-black tracking-[0.2em] text-amber-300">رحلة بسيطة</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">من التصفح حتى يوم المناسبة</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              أربع خطوات واضحة، بلا مفاجآت ولا رسوم مخفية.
            </p>

            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {profile.steps.map((step, index) => (
                <li key={step.title} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-lg font-black text-slate-950 shadow-lg shadow-amber-900/30">
                      {index + 1}
                    </span>
                    {index < profile.steps.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className="hidden h-px flex-1 bg-gradient-to-l from-amber-400/40 to-transparent lg:block"
                      />
                    ) : null}
                  </div>
                  <h3 className="mt-4 text-lg font-black text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
