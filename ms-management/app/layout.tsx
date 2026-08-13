import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/theme-provider";

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
  // Default brand colors — used as fallback if DB is unreachable
  let primaryColor = "#3B82F6";
  let sidebarColor = "#0A0F1C";
  let backgroundColor = "#f8fafc";
  let cardColor = "#ffffff";
  let textColor = "#0f172a";
  let borderColor = "#e2e8f0";
  let buttonColor = "#3b82f6";
  let headerColor = "#ffffff";
  let fontFamily = "Inter";

  // Dynamically import prisma so that a Prisma client initialization failure
  // (missing binary, wrong platform, cold-start) does NOT crash the entire layout
  // and cause an HTTP 500 on every page. If the import fails we silently fall back
  // to the default branding defined above.
  try {
    const { default: prisma } = await import("@/lib/prisma");
    const { getSessionUser } = await import("@/lib/auth-helpers");

    // Safely query user and settings with individual per-promise fallbacks
    const user = await getSessionUser().catch(() => null);

    const [companySettings, settings] = await Promise.all([
      user && user.company && user.company !== "System"
        ? prisma.company.findFirst({ where: { name: user.company } }).catch(() => null)
        : user && user.company === "System"
          ? prisma.company.findFirst({ where: { name: "MS Horizon F.Z.E" } }).catch(() => null)
          : Promise.resolve(null),
      prisma.siteSettings.findUnique({ where: { id: "SETTINGS" } }).catch(() => null),
    ]);

    if (settings) {
      if (settings.primaryColor)   primaryColor   = settings.primaryColor;
      if (settings.sidebarColor)   sidebarColor   = settings.sidebarColor;
      if (settings.backgroundColor) backgroundColor = settings.backgroundColor;
      if (settings.cardColor)      cardColor      = settings.cardColor;
      if (settings.textColor)      textColor      = settings.textColor;
      if (settings.borderColor)    borderColor    = settings.borderColor;
      if (settings.buttonColor)    buttonColor    = settings.buttonColor;
      if (settings.headerColor)    headerColor    = settings.headerColor;
      if (settings.fontFamily)     fontFamily     = settings.fontFamily;
    }

    // Per-tenant theme overrides
    if (companySettings) {
      let tc: any = null;
      try {
        tc = companySettings.themeConfig
          ? (typeof companySettings.themeConfig === "string"
              ? JSON.parse(companySettings.themeConfig)
              : companySettings.themeConfig)
          : null;
      } catch (_) {}

      if (tc) {
        if (tc.primaryColor)    primaryColor   = tc.primaryColor;
        if (tc.sidebarColor)    sidebarColor   = tc.sidebarColor;
        if (tc.backgroundColor) backgroundColor = tc.backgroundColor;
        if (tc.cardColor)       cardColor      = tc.cardColor;
        if (tc.textColor)       textColor      = tc.textColor;
        if (tc.borderColor)     borderColor    = tc.borderColor;
        if (tc.buttonColor)     buttonColor    = tc.buttonColor;
        if (tc.headerColor)     headerColor    = tc.headerColor;
        if (tc.fontFamily)      fontFamily     = tc.fontFamily;
      } else {
        if (companySettings.brandColor) {
          primaryColor = companySettings.brandColor;
          buttonColor  = companySettings.brandColor;
        }
        if (companySettings.secondaryColor) {
          sidebarColor  = companySettings.secondaryColor;
          headerColor   = companySettings.secondaryColor;
        }
      }
    }
  } catch (err) {
    // Non-fatal: the app still renders with default branding
    console.error("[RootLayout] Failed to load dynamic branding — using defaults:", err);
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
          "--primary":          primaryColor,
          "--ring":             primaryColor,
          "--sidebar":          sidebarColor,
          "--background":       backgroundColor,
          "--foreground":       textColor,
          "--card":             cardColor,
          "--card-foreground":  textColor,
          "--popover":          cardColor,
          "--popover-foreground": textColor,
          "--border":           borderColor,
          "--button-color":     buttonColor,
          "--header-color":     headerColor,
          "--font-body":        `"${fontFamily}", var(--font-sans)`,
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

