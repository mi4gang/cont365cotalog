import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Pages
// import Home from "./pages/Home"; // Removed - catalog is now homepage
import Catalog from "./pages/Catalog";
import ContainerDetail from "./pages/ContainerDetail";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminContainerEdit from "./pages/AdminContainerEdit";
import Setup from "./pages/Setup";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Catalog} />
      <Route path="/container/:id" component={ContainerDetail} />
      
      {/* Admin Routes (backdoor) */}
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/setup" component={Setup} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/container/:id" component={AdminContainerEdit} />
      
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
