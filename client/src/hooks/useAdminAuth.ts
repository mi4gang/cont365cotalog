import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

export function useAdminAuth(redirectTo: string = "/admin") {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  
  // Check if we have a token in localStorage
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  
  const { data: adminUser, isLoading, error } = trpc.adminAuth.me.useQuery(undefined, {
    enabled: !!token, // Only query if we have a token
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!token) {
      setIsChecking(false);
      setLocation(redirectTo);
      return;
    }

    if (!isLoading) {
      if (!adminUser) {
        // Token is invalid, remove it
        localStorage.removeItem("admin_token");
        setLocation(redirectTo);
      }
      setIsChecking(false);
    }
  }, [token, isLoading, adminUser, setLocation, redirectTo]);

  return {
    adminUser,
    isLoading: isChecking || isLoading,
    isAuthenticated: !!adminUser,
    error,
  };
}

export function useAdminLogout() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  
  const logoutMutation = trpc.adminAuth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("admin_token");
      utils.adminAuth.me.invalidate();
      setLocation("/admin");
    },
  });

  return {
    logout: () => {
      localStorage.removeItem("admin_token");
      logoutMutation.mutate();
    },
    isLoading: logoutMutation.isPending,
  };
}

// Helper to get auth headers for API calls
export function getAdminAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}
