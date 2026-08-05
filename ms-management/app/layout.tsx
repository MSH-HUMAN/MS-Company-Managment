import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/theme-provider";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

export const metadata: Metadata = {
  title: "MS SaaS Management Pro",
  description: "Multi-Company SaaS Management System",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Load site settings dynamically from DB to set CSS brand colors
  let primaryColor = "#3B82F6";
  let sidebarColor = "#0A0F1C";
  let backgroundColor = "#f8fafc";
  let cardColor = "#ffffff";
  let textColor = "#0f172a";
  let borderColor = "#e2e8f0";
  let buttonColor = "#3b82f6";
  let headerColor = "#ffffff";
  let fontFamily = "Inter";
  
  try {
    // Run all DB queries in parallel for maximum speed
    const user = await getSessionUser();

    const [companySettings, settings] = await Promise.all([
      user && user.company && user.company !== "System"
        ? prisma.company.findFirst({ where: { name: user.company } })
        : user && user.company === "System"
          ? prisma.company.findFirst({ where: { name: "MS Horizon F.Z.E" } })
          : Promise.resolve(null),
      prisma.siteSettings.findUnique({ where: { id: "SETTINGS" } })
    ]);

    if (settings) {
      if (settings.primaryColor) primaryColor = settings.primaryColor;
      if (settings.sidebarColor) sidebarColor = settings.sidebarColor;
      if (settings.backgroundColor) backgroundColor = settings.backgroundColor;
      if (settings.cardColor) cardColor = settings.cardColor;
      if (settings.textColor) textColor = settings.textColor;
      if (settings.borderColor) borderColor = settings.borderColor;
      if (settings.buttonColor) buttonColor = settings.buttonColor;
      if (settings.headerColor) headerColor = settings.headerColor;
      if (settings.fontFamily) fontFamily = settings.fontFamily;
    }

    // Tenant Overrides
    if (companySettings) {
      const tc = companySettings.themeConfig ? (typeof companySettings.themeConfig === "string" ? JSON.parse(companySettings.themeConfig) : companySettings.themeConfig) : null;
      if (tc) {
        if (tc.primaryColor) primaryColor = tc.primaryColor;
        if (tc.sidebarColor) sidebarColor = tc.sidebarColor;
        if (tc.backgroundColor) backgroundColor = tc.backgroundColor;
        if (tc.cardColor) cardColor = tc.cardColor;
        if (tc.textColor) textColor = tc.textColor;
        if (tc.borderColor) borderColor = tc.borderColor;
        if (tc.buttonColor) buttonColor = tc.buttonColor;
        if (tc.headerColor) headerColor = tc.headerColor;
        if (tc.fontFamily) fontFamily = tc.fontFamily;
      } else {
        if (companySettings.brandColor) {
          primaryColor = companySettings.brandColor;
          buttonColor = companySettings.brandColor;
        }
        if (companySettings.secondaryColor) {
          sidebarColor = companySettings.secondaryColor;
          headerColor = companySettings.secondaryColor;
        }
      }
    }
  } catch (err) {
    console.error("Failed to load dynamic branding in RootLayout:", err);
  }

  const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}:wght@300;400;500;600;700;800;900&display=swap`;

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={fontUrl} />
      </head>
      <body 
        className="min-h-full flex flex-col m-0 bg-background text-foreground animate-fade-in"
        style={{
          "--primary": primaryColor,
          "--ring": primaryColor,
          "--sidebar": sidebarColor,
          "--background": backgroundColor,
          "--foreground": textColor,
          "--card": cardColor,
          "--card-foreground": textColor,
          "--popover": cardColor,
          "--popover-foreground": textColor,
          "--border": borderColor,
          "--button-color": buttonColor,
          "--header-color": headerColor,
          "--font-body": `"${fontFamily}", var(--font-sans)`,
        } as any}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}

