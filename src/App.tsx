import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import SearchHomes from "./pages/SearchHomes";
import MyHome from "./pages/MyHome";
import Maintenance from "./pages/Maintenance";
import MaintenanceAI from "./pages/MaintenanceAI";
import Messages from "./pages/Messages";
import Payments from "./pages/Payments";
import Tenants from "./pages/Tenants";
import AgreementsAI from "./pages/AgreementsAI";
import NotFound from "./pages/NotFound";
import RentalAssistantWidget from "@/components/RentalAssistantWidget";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {!isAuthenticated ? (
        <>
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<Navigate to="/auth" />} />
        </>
      ) : (
        <>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/auth" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/search" element={<SearchHomes />} />
          <Route path="/my-home" element={<MyHome />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/maintenance-ai" element={<MaintenanceAI />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/agreements" element={<AgreementsAI />} />
          <Route path="/analytics" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </>
      )}
    </Routes>
  );
};

const AppShell = () => {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <AppRoutes />
      {isAuthenticated && <RentalAssistantWidget />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
