"use client";
import { useCallback } from "react";
import { useToast } from "@/contexts/ToastContext";
import { navigateSession } from "@/lib/session-navigation";

/** Every logout entry point reports network failure and offers the same retry. */
export function useLogout() {
  const { toast } = useToast();
  return useCallback(async function logout(): Promise<void> {
    try {
      const response = await fetch("/api/auth", { method: "DELETE", signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error("Logout failed");
      navigateSession("/login");
    } catch {
      toast({ message: "Couldn't log out. Reconnect and retry to end this session.", tone: "error", actionLabel: "Retry logout", onAction: () => void logout(), duration: 12000 });
    }
  }, [toast]);
}
