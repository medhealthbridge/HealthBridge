import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import CanvasLanding from "@/components/canvas-landing";
import ClinixLanding from "@/components/clinix-landing";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-heading",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "DataBridgeSol — Modular business software",
  description:
    "Pick the module your business needs, skip the rest. Records, POS, inventory and booking systems on an isolated workspace per client. Dental & medical clinics are live today.",
};

export default function Home() {
  return (
    <div
      className={`${plusJakartaSans.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      {/* <CanvasLanding /> */}
      <ClinixLanding />
    </div>
  );
}
