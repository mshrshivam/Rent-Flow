import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, User, UserCircle } from 'lucide-react';
import LoginScene from '@/components/3d/LoginScene';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

type AppRole = 'owner' | 'manager' | 'tenant';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole>('tenant');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  
  const navigate = useNavigate();
  const { login, signUp, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => setShowForm(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const validateForm = () => {
    const errors: { email?: string; password?: string; fullName?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        errors.email = e.errors[0].message;
      }
    }
    
    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        errors.password = e.errors[0].message;
      }
    }
    
    if (!isLogin && !fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(email, password);
      } else {
        result = await signUp(email, password, fullName, selectedRole);
      }
      
      if (result.error) {
        setError(result.error);
        toast({
          title: 'Authentication Failed',
          description: result.error || 'Invalid email or password. Please try again.',
          variant: 'destructive',
        });
        setIsLoading(false);
      } else {
        // Success - redirect to dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 500);
      }
    } catch (err) {
      const errorMessage = 'Something went wrong. Please try again.';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const roles: { value: AppRole; label: string; description: string }[] = [
    { value: 'owner', label: 'Owner', description: 'Manage your properties' },
    { value: 'manager', label: 'Manager', description: 'Manage assigned properties' },
    { value: 'tenant', label: 'Tenant', description: 'Rent and manage your home' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <LoginScene />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, type: 'spring' }}
            className="relative z-10 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="glass-card p-8 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h1 className="font-display text-3xl font-bold gradient-text">RentFlow</h1>
                <p className="text-muted-foreground mt-2">
                  {isLogin ? 'Sign in to your account' : 'Create your account'}
                </p>
              </motion.div>

              <motion.form
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {!isLogin && (
                  <div className="space-y-1">
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="input-glass pl-12"
                      />
                    </div>
                    {validationErrors.fullName && (
                      <p className="text-xs text-destructive ml-1">{validationErrors.fullName}</p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-glass pl-12"
                    />
                  </div>
                  {validationErrors.email && (
                    <p className="text-xs text-destructive ml-1">{validationErrors.email}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-glass pl-12 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="text-xs text-destructive ml-1">{validationErrors.password}</p>
                  )}
                </div>

                {!isLogin && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <UserCircle className="w-4 h-4" />
                      Select your role
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {roles.map((role) => (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => setSelectedRole(role.value)}
                          className={`p-3 rounded-xl border transition-all text-center ${
                            selectedRole === role.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-white/10 bg-muted/30 text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          <p className="font-medium text-sm">{role.label}</p>
                          <p className="text-xs opacity-70 mt-1 line-clamp-2">{role.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                  >
                    {error}
                  </motion.p>
                )}

                {isLogin && (
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded bg-muted border-white/10" />
                      <span className="text-muted-foreground">Remember me</span>
                    </label>
                    <button type="button" className="text-primary hover:text-primary/80 transition-colors">
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <>
                      {isLogin ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </motion.form>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center text-sm text-muted-foreground"
              >
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setValidationErrors({});
                  }}
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  {isLogin ? 'Create one' : 'Sign in'}
                </button>
              </motion.p>

              {isLogin && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-xs text-foreground/80"
                >
                  <p className="font-semibold mb-2">Test Credentials:</p>
                  <div className="space-y-1 font-mono text-xs">
                    <p>📧 <span className="text-primary">owner@test.com</span> (Owner)</p>
                    <p>📧 <span className="text-primary">manager@test.com</span> (Manager)</p>
                    <p>📧 <span className="text-primary">tenant@test.com</span> (Tenant)</p>
                    <p>🔑 <span className="text-primary">password123</span></p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <p className="font-semibold mb-1">Tenant Login:</p>
                    <p className="text-[10px] opacity-80">Use tenant email from Tenants page</p>
                    <p className="text-[10px] opacity-80">Password: <span className="text-primary">password123</span></p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!showForm && (
          <motion.div
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/50">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <p className="mt-4 text-lg font-display text-foreground/80">Welcome Home...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Auth;
