import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  // Domain stage variants
  | 'APPLIED'
  | 'SCREENING'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'OFFERED'
  | 'REJECTED'
  // Job status variants
  | 'DRAFT'
  | 'PUBLISHED'
  | 'CLOSED'
  | 'ARCHIVED';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string; dotColor: string }> = {
    default: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200', dotColor: 'bg-slate-500' },
    primary: { bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200', dotColor: 'bg-brand-500' },
    success: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dotColor: 'bg-emerald-500' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dotColor: 'bg-amber-500' },
    danger: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dotColor: 'bg-rose-500' },
    info: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dotColor: 'bg-sky-500' },

    // Application stage mappings
    APPLIED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dotColor: 'bg-blue-500' },
    SCREENING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dotColor: 'bg-amber-500' },
    INTERVIEW: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dotColor: 'bg-purple-500' },
    SELECTED: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dotColor: 'bg-teal-500' },
    OFFERED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dotColor: 'bg-emerald-500' },
    REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dotColor: 'bg-rose-500' },

    // Job status mappings
    DRAFT: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', dotColor: 'bg-slate-400' },
    PUBLISHED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dotColor: 'bg-emerald-500' },
    CLOSED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dotColor: 'bg-amber-500' },
    ARCHIVED: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dotColor: 'bg-slate-400' },
  };

  const style = variantStyles[variant] || variantStyles.default;
  const sizeStyles = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${style.bg} ${style.text} ${style.border} ${sizeStyles} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${style.dotColor}`}></span>}
      {children}
    </span>
  );
};
