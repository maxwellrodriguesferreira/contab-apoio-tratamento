import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPath,
  onNavigate,
  children,
}) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-surface flex">
      <Sidebar
        currentPath={currentPath}
        onNavigate={onNavigate}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header onToggleMobileMenu={() => setIsOpenMobile(true)} />
        <main className="flex-1 pt-20 px-4 sm:px-6 lg:px-8 pb-12 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
