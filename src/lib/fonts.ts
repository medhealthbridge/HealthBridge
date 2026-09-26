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
  variable: "--font-code",
});

/** Feeds the `font-display`, `font-text` and `font-data` utilities. */
export const brandFontVariables = `${plusJakartaSans.variable} ${inter.variable} ${jetbrainsMono.variable}`;
