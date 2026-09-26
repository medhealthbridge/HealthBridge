"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { BRANCHES, type Branch } from "@/src/lib/mock-data/clinix-admin";

type BranchState = { branch: Branch; setBranchKey: (key: string) => void };

const BranchContext = createContext<BranchState | null>(null);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [key, setBranchKey] = useState(BRANCHES[0].key);
  const branch = BRANCHES.find((b) => b.key === key) ?? BRANCHES[0];
  return <BranchContext.Provider value={{ branch, setBranchKey }}>{children}</BranchContext.Provider>;
}

export function useActiveBranch() {
  const state = useContext(BranchContext);
  if (!state) throw new Error("useActiveBranch must be used inside <BranchProvider>");
  return state;
}

/** Inline text leaf so server-rendered headers can show the selected branch. */
export function ActiveBranchName() {
  return <>{useActiveBranch().branch.name}</>;
}
