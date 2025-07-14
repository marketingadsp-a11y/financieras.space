
"use client";

import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/context/auth-context";
import React from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [appName, setAppName] = React.useState("Panel de Administración");

  React.useEffect(() => {
    const storedAppName = localStorage.getItem('appName');
    if (storedAppName) {
      setAppName(storedAppName);
      document.title = storedAppName;
    }

    const handleStorageChange = () => {
       const updatedAppName = localStorage.getItem('appName');
        if (updatedAppName) {
          setAppName(updatedAppName);
          document.title = updatedAppName;
        }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <title>{appName}</title>
        <meta name="description" content="Gestión de administradores y herramientas." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
