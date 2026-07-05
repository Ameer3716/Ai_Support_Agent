'use client';

import Reveal from '@/components/Reveal';
import { useDemo } from '@/components/DemoProvider';

export default function LiveDemo() {
  const { status } = useDemo();

  let copy = "This is the actual widget, not a mockup - look for the chat bubble in the bottom-right corner of this page and ask it something.";
  if (status === 'unavailable') {
    copy = 'The live demo isn\u2019t active on this server yet - run "npm run seed-demo" on the backend to turn it on.';
  } else if (status === 'error') {
    copy = "Couldn't reach the server to check the demo - try the admin dashboard instead.";
  }

  return (
    <section id="live-demo" className="py-24">
      <div className="mx-auto max-w-6xl px-6 text-left">
        <Reveal>
          <h2 className="mb-5 font-serif text-3xl italic text-text sm:text-4xl">See it answer for itself.</h2>
          <p className="mb-10 max-w-[560px] text-base text-text-muted">{copy}</p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="card relative mx-auto max-w-2xl overflow-hidden rounded-2xl shadow-glow-md">
            <div className="absolute -inset-10 -z-10 rounded-full bg-accent/10 blur-3xl" />
            <div className="flex items-center gap-2 border-b border-border bg-surface/[0.03] px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e0685a]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#e3b34a]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#67b07a]" />
              <span className="ml-2 font-mono text-[0.72rem] text-text-muted">sunrisedental.example.com</span>
            </div>
            <div className="px-6 py-16 text-center">
              <p className="font-mono text-sm text-text-muted">
                ↘ the real widget is live on this page - bottom-right corner
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
