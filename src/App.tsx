import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { I18nProvider } from "@/i18n/context";
import { DataProvider } from "@/store/DataContext";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import IncomePage from "@/pages/IncomePage";
import ExpensesPage from "@/pages/ExpensesPage";
import CardsPage from "@/pages/CardsPage";
import AccountsPage from "@/pages/AccountsPage";
import BudgetPage from "@/pages/BudgetPage";
import ReportsPage from "@/pages/ReportsPage";
import MetasPage from "@/pages/MetasPage";
import SettingsPage from "@/pages/SettingsPage";
import SubscriptionPage from "@/pages/SubscriptionPage";
import CategoriesPage from "@/pages/CategoriesPage";
import PayablesReceivablesPage from "@/pages/PayablesReceivablesPage";
import CommitmentsPage from "@/pages/CommitmentsPage";
import OpenFinancePage from "@/pages/OpenFinancePage";
import LoginPage from "@/pages/LoginPage";
import HelpPage from "@/pages/HelpPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppLayout />;
};

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <DataProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route element={<ProtectedLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/income" element={<IncomePage />} />
                    <Route path="/expenses" element={<ExpensesPage />} />
                    <Route path="/cards" element={<CardsPage />} />
                    <Route path="/accounts" element={<AccountsPage />} />
                    <Route path="/budget" element={<BudgetPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/metas" element={<MetasPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/subscription" element={<SubscriptionPage />} />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/payables" element={<PayablesReceivablesPage />} />
                    <Route path="/commitments" element={<CommitmentsPage />} />
                    <Route path="/open-finance" element={<OpenFinancePage />} />
                    <Route path="/help" element={<HelpPage />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </DataProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
