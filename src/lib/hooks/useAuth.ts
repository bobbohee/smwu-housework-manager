"use client";

import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "@/lib/providers/AuthProvider";

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
