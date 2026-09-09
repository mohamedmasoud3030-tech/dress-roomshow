import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import type { LandingProfile } from './types';
import { Reveal } from './Reveal';

export function LandingFaq({ profile }: { profile: LandingProfile }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="mt-24 scroll-mt-24 sm:mt-32">
      <Reveal>
        <div className="max-w-2xl">
          <p className="text-xs font-black tracking-[0.2em] text-amber-600">الأسئلة الشائعة</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
            ما تحتاجين معرفته قبل الزيارة
          </h2>
        </div>
      </Reveal>

      <div className="mt-8 divide-y divide-slate-200 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        {profile.faq.map((item, index) => {
          const open = openIndex === index;
          return (
            <Reveal key={item.question} delay={index * 50}>
              <div>
                <h3>
                  <Button
                    type="button"
                    variant="quiet"
                    onClick={() => setOpenIndex(open ? null : index)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-right hover:bg-slate-50 sm:px-7"
                  >
                    <span className="text-base font-black text-slate-950 sm:text-lg">
                      {item.question}
                    </span>
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition duration-300 ${
                        open
                          ? 'rotate-45 border-amber-400 bg-amber-400 text-slate-950'
                          : 'border-slate-300 text-slate-500'
                      }`}
                    >
                      <Plus aria-hidden="true" className="h-4 w-4" />
                    </span>
                  </Button>
                </h3>
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-6 text-sm leading-8 text-slate-600 sm:px-7">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
