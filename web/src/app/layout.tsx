import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kachingg · A clearer picture of your cash",
  description: "Stay ahead of cash gaps, follow up invoices, and verify payments. Kachingg demo with synthetic data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
