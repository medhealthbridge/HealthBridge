import { brandFontVariables } from "@/src/lib/fonts";

export default function ClinixPhLayout({ children }: { children: React.ReactNode }) {
  return <div className={brandFontVariables}>{children}</div>;
}
