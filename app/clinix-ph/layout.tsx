import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-heading",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-mono",
});

export default function ClinixPhLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${plusJakartaSans.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      {children}
    </div>
  );
}
