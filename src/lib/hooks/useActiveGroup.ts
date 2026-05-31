"use client";

import { useContext } from "react";
import {
  ActiveGroupContext,
  type ActiveGroupContextValue,
} from "@/lib/providers/ActiveGroupProvider";

export function useActiveGroup(): ActiveGroupContextValue {
  return useContext(ActiveGroupContext);
}
