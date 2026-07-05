'use client';

import { motion } from 'framer-motion';
import Button from '@/components/Button';
import { useDemo } from '@/components/DemoProvider';
import { API_BASE_URL } from '@/lib/api';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

export default function Hero() {
  const { status, openDemoBot } = useDemo();

  return (
    <section className="relative overflow-hidden pb-24 pt-20 sm:pt-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-16 px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.12 } } }}>
          <motion.span
            variants={fadeUp}
            className="mb-6 inline-block -rotate-1 rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-text-muted shadow-glow-sm"
          >
            Front desk, automated
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="mb-6 font-serif text-[2.75rem] font-semibold leading-[1.02] tracking-tight text-text sm:text-6xl lg:text-[4.2rem]"
          >
            Never leaves
            <br />
            <span className="text-accent-text font-bold">the desk.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mb-8 max-w-[480px] text-lg leading-relaxed text-text-muted">
            An AI agent that answers your customers instantly — on your website, WhatsApp, and Instagram — using
            only what&rsquo;s actually in your own FAQs and docs. No invented answers, no waiting until 9am.
          </motion.p>

          <motion.div variants={fadeUp} className="mb-8 flex flex-wrap gap-4">
            <Button as="a" href={`${API_BASE_URL}/admin`} variant="primary" className="font-serif animate-pulse-glow">
              Open admin dashboard
            </Button>
            <Button variant="card" onClick={openDemoBot}>
              {status === 'active' ? 'Talk to the demo bot ↓' : 'See how it works ↓'}
            </Button>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[0.7rem] uppercase tracking-[0.08em] text-text-muted"
          >
            <span>Grounded in your docs</span>
            <span aria-hidden="true">·</span>
            <span>Never invents an answer</span>
            <span aria-hidden="true">·</span>
            <span>Quota-protected</span>
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, rotate: 2 }}
          animate={{ opacity: 1, y: 0, rotate: 1.2 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
          className="relative mx-auto w-full max-w-[340px]"
        >
          <div className="absolute -inset-6 -z-10 rounded-[28px] bg-bg-border blur-3xl" />
          <div className="card relative overflow-hidden rounded-2xl p-6 font-mono text-[0.8rem] leading-relaxed text-text shadow-glow-lg">
            {/* scanning glow line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent to-transparent animate-scanline" />

            <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
              <span className="font-semibold tracking-wide">SUNRISE DENTAL CLINIC</span>
              <span className="flex items-center gap-1.5 text-text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" /> live
              </span>
            </div>

            <div className="mb-1 text-[0.68rem] text-text-muted">09:14</div>
            <div className="mb-3 text-text/90">
              <b className="text-text-muted">Customer —</b> Do you accept insurance?
            </div>
            <div className="mb-1 text-[0.68rem] text-text-muted">09:14</div>
            <div className="mb-4 text-text/90">
              <b className="text-text-muted">Agent —</b> We accept most major dental plans — bring your card to your
              first visit and we&rsquo;ll verify coverage.
            </div>

            <div className="mb-3 border-t border-dashed border-border" />
            <div className="mb-1 font-semibold">
              STATUS: <span className="text-text-muted">ANSWERED ✓</span>
            </div>
            <div className="text-[0.68rem] text-text-muted">0 escalations · 1 conversation · $0 spent on a human</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
