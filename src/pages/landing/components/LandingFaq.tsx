import { useState } from 'react';
import type { LandingProfile } from './types';

export function LandingFaq({ profile }: { profile: LandingProfile }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-[#FFFCF8] py-10 sm:py-12">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-8 lg:px-10">
        <div className="flex items-baseline gap-4 border-b border-[#E8E2D9] pb-4">
          <h2 className="text-[13px] font-medium tracking-[0.08em] text-black">أسئلة</h2>
          <span className="text-[11px] text-[#8B8680]">{profile.faq.length} إجابات</span>
        </div>
        <div className="divide-y divide-[#E8E2D9]">
          {profile.faq.slice(0, 3).map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.question}>
                <button type="button" onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-4 py-4 text-right">
                  <span className="text-[13px] font-medium text-black">{item.question}</span>
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[12px] ${isOpen ? 'border-black bg-black text-white' : 'border-[#E8E2D9] text-[#8B8680]'}`}>{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen ? <p className="pb-4 text-[12px] font-light leading-[1.7] text-[#8B8680]">{item.answer}</p> : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
