import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Index from "@/pages/Index";
import Settings from "@/pages/Settings";
import AboutUs from "@/pages/AboutUs";
import Admin from "@/pages/Admin";
import ContestPage from "@/pages/ContestPage";
import Download from "@/pages/Download";
import AccountVerification from "@/pages/AccountVerification";
import NotFound from "@/pages/NotFound";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/hooks/useAuth";
import { AppUpdateWatcher } from "@/components/AppUpdateWatcher";
import { WhatsNew } from "@/components/WhatsNew";

const App = () => {
  return (
    <HelmetProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        storageKey="advance_theme_pref"
        disableTransitionOnChange
      >
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/download" element={<Download />} />
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/contest/:id"
                element={
                  <ProtectedRoute>
                    <ContestPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/app/*"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/verification"
                element={
                  <ProtectedRoute>
                    <AccountVerification />
                  </ProtectedRoute>
                }
              />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <AppUpdateWatcher />
            <WhatsNew />
            </AuthProvider>
          </BrowserRouter>
          <Toaster />
          <SonnerToaster />
        </TooltipProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
};

export default App;
