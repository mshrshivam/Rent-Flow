import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, User, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import GlassCard from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user?.id) return;
      try {
        const response = await fetch(`/api/notifications?userId=${encodeURIComponent(user.id)}`);
        if (!response.ok) return;
        const data = await response.json();
        setNotifications(data || []);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const roleColors = {
    owner: 'bg-primary/20 text-primary',
    manager: 'bg-secondary/20 text-secondary',
    tenant: 'bg-accent/20 text-accent',
  };

  return (
    <header className="h-20 flex items-center justify-between pl-16 md:pl-8 pr-4 md:pr-8 border-b border-white/5 bg-background/50 backdrop-blur-xl gap-3">
      {/* Search */}
      <div className="relative hidden lg:block w-96">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search properties, tenants, payments..."
          className="input-glass pl-12"
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 md:gap-4 ml-auto">
        {/* Role Badge */}
        {user?.role && (
          <div className={cn(
            'px-3 py-1.5 rounded-lg capitalize text-sm font-medium',
            roleColors[user.role]
          )}>
            {user.role}
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full text-xs flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-80 z-50"
              >
                <GlassCard className="p-4">
                  <h3 className="font-display font-semibold mb-4">Notifications</h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {notifications.length === 0 && (
                      <p className="text-sm text-muted-foreground">No notifications yet.</p>
                    )}
                    {notifications.slice(0, 5).map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          'p-3 rounded-xl transition-colors cursor-pointer',
                          notification.is_read ? 'bg-muted/30' : 'bg-primary/10 hover:bg-primary/20'
                        )}
                      >
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 pr-2 md:pr-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium">{user?.fullName || user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-56 z-50"
              >
                <GlassCard className="p-2">
                  <button className="w-full p-3 rounded-xl text-left hover:bg-muted/50 transition-colors">
                    Profile Settings
                  </button>
                  <button className="w-full p-3 rounded-xl text-left hover:bg-muted/50 transition-colors">
                    Preferences
                  </button>
                  <button className="w-full p-3 rounded-xl text-left hover:bg-muted/50 transition-colors">
                    Help & Support
                  </button>
                  <div className="my-2 border-t border-white/5"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full p-3 rounded-xl text-left hover:bg-destructive/20 transition-colors flex items-center gap-2 text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
