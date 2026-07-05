import { API_BASE_URL } from '@/lib/api';

export default function Footer() {
  return (
    <footer className="border-t border-border/[0.06] bg-black py-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm text-text-muted">
        <span className="font-mono">AI Support Agent</span>
        <a href={`${API_BASE_URL}/admin`} className="transition-colors hover:text-text-muted">
          Admin dashboard
        </a>
      </div>
    </footer>
  );
}
