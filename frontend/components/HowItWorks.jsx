'use client';

import Reveal from '@/components/Reveal';

const steps = [
  {
    no: 'No.01',
    title: 'Add their docs',
    body: 'Paste FAQ text, upload a PDF, or point it at a page — from the dashboard, or the API if you\u2019re wiring it into an automation.',
  },
  {
    no: 'No.02',
    title: 'Drop in the widget',
    body: "One script tag on their site. No build step, no iframe wrangling on their end.",
  },
  {
    no: 'No.03',
    title: 'Watch it work',
    body: 'Every conversation, lead, and quota shows up live in the admin dashboard.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="mb-14 font-serif text-3xl italic text-text sm:text-4xl">Live in three steps.</h2>
        </Reveal>

        <div className="relative flex flex-col gap-10">
          <div className="absolute left-[28px] top-2 bottom-2 hidden w-px bg-gradient-to-b from-chic-400/50 via-white/10 to-transparent sm:block" />
          {steps.map((step, i) => (
            <Reveal key={step.no} delay={i * 0.1} className="relative flex gap-6 sm:gap-8">
              <span className="relative z-10 w-14 flex-shrink-0 pt-0.5 font-mono text-sm font-semibold text-text-muted">
                {step.no}
              </span>
              <div>
                <h3 className="mb-1.5 text-lg font-semibold text-text">{step.title}</h3>
                <p className="max-w-[480px] text-[0.94rem] leading-relaxed text-text-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
