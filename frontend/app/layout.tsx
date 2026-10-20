import type { Metadata } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// One variable family: normal width for body, extra-condensed (font-stretch) for headings
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ping My Nest: Never miss an open class at USM",
  description:
    "Ping My Nest monitors University of Southern Mississippi course availability and emails you the moment a seat opens.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              borderRadius: "0.5rem",
              border: "1px solid var(--line)",
              boxShadow: "var(--shadow-float)",
              fontFamily: "var(--font-archivo)",
            },
          }}
        />
      </body>
    </html>
  );
}
