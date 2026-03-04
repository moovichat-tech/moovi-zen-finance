import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { I18nProvider } from "@/i18n/context";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import PageShell from "@/pages/PageShell";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/income" element={<PageShell pageKey="income" />} />
              <Route path="/expenses" element={<PageShell pageKey="expenses" />} />
              <Route path="/cards" element={<PageShell pageKey="cards" />} />
              <Route path="/accounts" element={<PageShell pageKey="accounts" />} />
              <Route path="/budget" element={<PageShell pageKey="budget" />} />
              <Route path="/reports" element={<PageShell pageKey="reports" />} />
              <Route path="/ai" element={<PageShell pageKey="ai" />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
