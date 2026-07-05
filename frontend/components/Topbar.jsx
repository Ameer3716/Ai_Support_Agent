'use client';

import Button from '@/components/Button';
import { API_BASE_URL } from '@/lib/api';

export default function Topbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/[0.06] bg-bg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="/" className="font-serif text-sm font-semibold tracking-wide text-text">
          <span className="text-black font-semibold">AI Support Agent</span>
        </a>
        <Button as="a" href={`${API_BASE_URL}/admin`} variant="card" className="font-serif !px-4 !py-2 text-xs">
          Admin dashboard
        </Button>
      </div>
    </header>
  );
}
