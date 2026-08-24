import React, { ReactNode } from 'react';

export function Badge({ status, children }: { status: string; children?: ReactNode }) {
  const normalizedStatus = status.toLowerCase();
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium badge-${normalizedStatus}`}>
      {children || status}
    </span>
  );
}
