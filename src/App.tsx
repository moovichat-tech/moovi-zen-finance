import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/i18n/context";
import { DataProvider } from "@/store/DataContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import IncomePage from "@/pages/IncomePage";
import ExpensesPage from "@/pages/ExpensesPage";
import CardsPage from "@/pages/CardsPage";
import AccountsPage from "@/pages/AccountsPage";
import BudgetPage from "@/pages/BudgetPage";
import ReportsPage from "@/pages/ReportsPage";
import AIPage from "@/pages/AIPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <DataProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/income" element={<IncomePage />} />
                <Route path="/expenses" element={<ExpensesPage />} />
                <Route path="/cards" element={<CardsPage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/budget" element={<BudgetPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/ai" element={<AIPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </DataProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
