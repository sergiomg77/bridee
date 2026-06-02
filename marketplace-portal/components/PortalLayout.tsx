'use client';

import { type ReactNode } from 'react';
import Sidebar from './Sidebar';

interface PortalLayoutProps {
  title: string;
  children: ReactNode;
}

export default function PortalLayout({ title, children }: PortalLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAF8]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 h-16 bg-white border-b border-gray-100 flex items-center px-6">
          <h1 className="text-sm font-medium text-gray-700">{title}</h1>
        </header>
        {/* Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
