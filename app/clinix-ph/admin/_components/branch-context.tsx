"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type ConsoleBranch = { key: string; name: string; initial: string };

type BranchState = {
  branches: ConsoleBranch[];
  branch: ConsoleBranch;
  setBranchKey: (key: string) => void;
};

const BranchContext = createContext<BranchState | null>(null);

type BranchProviderProps = { branches: ConsoleBranch[]; initialKey: string; children: ReactNode };

export function BranchProvider({ branches, initialKey, children }: BranchProviderProps) {
  const [key, setBranchKey] = useState(initialKey);
  const branch = branches.find((b) => b.key === key) ?? branches[0];
  return <BranchContext.Provider value={{ branches, branch, setBranchKey }}>{children}</BranchContext.Provider>;
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
