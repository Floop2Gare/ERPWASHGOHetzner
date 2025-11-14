import { ReactNode } from 'react';

interface TagProps {
  children: ReactNode;
}

export const Tag = ({ children }: TagProps) => (
  <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.25 text-[10px] font-medium text-slate-500">
    {children}
  </span>
);
