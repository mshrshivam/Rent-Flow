import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb w-[600px] h-[600px] bg-primary -top-48 -left-48" />
        <div className="glow-orb w-[500px] h-[500px] bg-secondary top-1/2 right-0 translate-x-1/2" />
        <div className="glow-orb w-[400px] h-[400px] bg-accent bottom-0 left-1/3" />
      </div>

      <Sidebar />
      
      <main className="ml-0 md:ml-[280px] min-h-screen relative">
        <Header />
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
