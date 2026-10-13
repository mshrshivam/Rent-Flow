import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Building2,
  Users,
  CreditCard,
  Wrench,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  FileText,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

  const ownerLinks = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/properties', icon: Building2, label: 'Properties' },
    { path: '/tenants', icon: Users, label: 'Tenants' },
    { path: '/payments', icon: CreditCard, label: 'Payments' },
    { path: '/maintenance', icon: Wrench, label: 'Maintenance' },
    { path: '/maintenance-ai', icon: Sparkles, label: 'AI Damage Check' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/messages', icon: MessageSquare, label: 'Messages' },
    { path: '/agreements', icon: FileText, label: 'Agreements AI' },
  ];

  const tenantLinks = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/search', icon: Search, label: 'Find Homes' },
    { path: '/my-home', icon: Building2, label: 'My Home' },
    { path: '/payments', icon: CreditCard, label: 'Rent' },
    { path: '/maintenance', icon: Wrench, label: 'Maintenance' },
    { path: '/maintenance-ai', icon: Sparkles, label: 'AI Damage Check' },
    { path: '/messages', icon: MessageSquare, label: 'Messages' },
    { path: '/agreements', icon: FileText, label: 'Agreements AI' },
  ];

  const managerLinks = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/properties', icon: Building2, label: 'Properties' },
    { path: '/tenants', icon: Users, label: 'Tenants' },
    { path: '/payments', icon: CreditCard, label: 'Rent Tracking' },
    { path: '/maintenance', icon: Wrench, label: 'Maintenance' },
    { path: '/maintenance-ai', icon: Sparkles, label: 'AI Damage Check' },
    { path: '/messages', icon: MessageSquare, label: 'Messages' },
    { path: '/agreements', icon: FileText, label: 'Agreements AI' },
  ];

  const links = user?.role === 'owner' ? ownerLinks : user?.role === 'tenant' ? tenantLinks : managerLinks;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {isMobile && (
        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="fixed left-4 top-4 z-[60] p-2 rounded-lg bg-card/80 border border-white/10"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      )}

      {isMobile && mobileOpen && (
        <button
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu overlay"
        />
      )}

      <motion.aside
      initial={false}
      animate={
        isMobile
          ? { x: mobileOpen ? 0 : -300, width: 280 }
          : { width: isCollapsed ? 80 : 280, x: 0 }
      }
      className="fixed left-0 top-0 h-screen z-50 flex flex-col bg-sidebar/80 backdrop-blur-xl border-r border-white/5"
      >
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-white/5">
        <motion.div 
          className="flex items-center gap-3"
          animate={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-display font-bold text-xl whitespace-nowrap overflow-hidden"
              >
                RentFlow
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => isMobile && setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                'hover:bg-white/5',
                isActive && 'bg-gradient-primary text-white shadow-lg shadow-primary/20'
              )}
            >
              <link.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-white' : 'text-muted-foreground')} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className={cn(
                      'text-sm font-medium whitespace-nowrap overflow-hidden',
                      isActive ? 'text-white' : 'text-muted-foreground'
                    )}
                  >
                    {link.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-white/5 space-y-2">
        <Link
          to="/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-white/5 text-muted-foreground"
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-destructive/10 text-destructive"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Toggle Button */}
      {!isMobile && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-24 w-6 h-6 rounded-full bg-card border border-white/10 flex items-center justify-center shadow-lg hover:bg-primary hover:border-primary transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      )}
      </motion.aside>
    </>
  );
};

export default Sidebar;
