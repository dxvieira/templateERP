
'use client';

import { usePathname } from 'next/navigation';
import { FirebaseClientProvider } from '@/firebase';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { Toaster } from '@/components/ui/toaster';
import { AccessGuard } from '@/components/auth/AccessGuard';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

/**
 * RootLayout - Shell principal da aplicação.
 * Otimizado para performance instantânea e persistência de estado do Sidebar.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <title>ERP • Terminal de Comando</title>
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <AccessGuard>
              <div className="flex h-screen w-screen overflow-hidden bg-background">
                {!isLoginPage && <DashboardSidebar />}
                <main id="main-content" className="flex-1 h-full overflow-y-auto overflow-x-hidden relative custom-scrollbar selection:bg-primary selection:text-primary-foreground">
                  {children}
                </main>
              </div>
            </AccessGuard>
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
