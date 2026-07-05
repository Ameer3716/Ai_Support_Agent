'use client';

import { Globe, MessageCircle, BookOpen, LifeBuoy } from 'lucide-react';
import Reveal from '@/components/Reveal';

const items = [
  {
    icon: Globe,
    eyebrow: 'Channel',
    title: 'Website widget',
    body: 'One script tag. A chat bubble appears on their site and answers visitors instantly, day or night.',
  },
  {
    icon: MessageCircle,
    eyebrow: 'Channel',
    title: 'WhatsApp & Instagram',
    body: 'Same brain, same answers - connected to WhatsApp via Twilio and to Instagram DMs, no extra setup per channel.',
  },
  {
    icon: BookOpen,
    eyebrow: 'Knowledge',
    title: "Answers from their own docs",
    body: "Paste an FAQ, upload a PDF, or point it at a page. It only answers from what's actually there - it won't make things up.",
  },
  {
    icon: LifeBuoy,
    eyebrow: 'Safety net',
    title: 'Leads & handoff',
    body: "When it can't answer, or someone asks for a human, it collects their contact details instead of guessing.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <h2 className="mb-12 font-serif text-3xl italic text-text sm:text-4xl">One brain, three doors in.</h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08}>
              <div className="card group relative h-full rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-border hover:shadow-glow-md">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-text-muted transition-colors group-hover:bg-accent/25">
                  <item.icon size={20} strokeWidth={1.8} />
                </div>
                <span className="mb-2 block font-mono text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {item.eyebrow}
                </span>
                <h3 className="mb-2 text-lg font-semibold text-text">{item.title}</h3>
                <p className="text-[0.94rem] leading-relaxed text-text-muted">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
