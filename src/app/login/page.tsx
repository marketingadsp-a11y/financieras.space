
'use client';

import * as React from 'react';
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
    React.useEffect(() => {
        const storedAppName = localStorage.getItem('appName');
        if (storedAppName) {
            document.title = `${storedAppName} - Inicio de Sesión`;
        } else {
            document.title = 'Inicio de Sesión';
        }
    }, []);

    return <LoginForm />;
}
