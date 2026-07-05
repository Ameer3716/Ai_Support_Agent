'use client';

import { motion } from 'framer-motion';

const base =
  'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3.5 text-sm font-semibold tracking-tight transition-shadow duration-200 select-none';

const variants = {
  primary: 'btn-primary shadow-glow-md hover:shadow-glow-lg',
  secondary: 'btn-secondary',
  card: 'btn-secondary',
  ghost: 'bg-transparent text-text-muted hover:text-text-muted px-3 py-2',
};

export default function Button({
  as = 'button',
  href,
  variant = 'primary',
  className = '',
  children,
  ...props
}) {
  const Component = motion[as] || motion.button;
  const isPrimary = variant === 'primary';

  return (
    <Component
      href={href}
      whileHover={{ scale: 1.035, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
      {isPrimary && (
        <span className="pointer-events-none absolute -top-1/2 left-0 h-[220%] w-1/3 -translate-x-[140%] bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-hover:animate-shimmer" />
      )}
    </Component>
  );
}
