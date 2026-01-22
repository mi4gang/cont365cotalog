import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AdminAuthGuard from "./components/AdminAuthGuard";

// Pages
// import Home from "./pages/Home"; // Removed - catalog is now homepage
import Catalog from "./pages/Catalog";
import ContainerDetail from "./pages/ContainerDetail";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminContainerEdit from "./pages/AdminContainerEdit";
import Setup from "./pages/Setup";

// Wrapper for protected admin routes
function ProtectedAdminRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <AdminAuthGuard>
      <Component />
    </AdminAuthGuard>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Catalog} />
      <Route path="/container/:id" component={ContainerDetail} />
      
      {/* Admin Routes */}
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/setup" component={Setup} />
      
      {/* Protected Admin Routes - require authentication */}
      <Route path="/admin/dashboard">
        <ProtectedAdminRoute component={AdminDashboard} />
      </Route>
      <Route path="/admin/container/:id">
        <ProtectedAdminRoute component={AdminContainerEdit} />
      </Route>
      
      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
