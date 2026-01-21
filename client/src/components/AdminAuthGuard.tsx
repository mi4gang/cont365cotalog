import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Loader2 } from "lucide-react";

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

/**
 * Protects admin routes by checking authentication status.
 * Redirects to /admin login page if not authenticated.
 * Shows loading spinner while checking auth status.
 */
export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const { adminUser, isLoading, isAuthenticated } = useAdminAuth("/admin");

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // If not authenticated, useAdminAuth will redirect to /admin
  // Return null while redirect happens
  if (!isAuthenticated || !adminUser) {
    return null;
  }

  // Authenticated - render children
  return <>{children}</>;
}
