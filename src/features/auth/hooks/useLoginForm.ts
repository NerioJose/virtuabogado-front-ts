import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

export function useLoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(true);
    const persistTimerRef = useRef<NodeJS.Timeout | null>(null);

    const { login, isLoading, error } = useAuth();

    // Cargar preferencias guardadas al montar el componente
    useEffect(() => {
        const savedRemember = localStorage.getItem('remember_me');
        if (savedRemember !== null) {
            const isRemembered = savedRemember === 'true';
            setRemember(isRemembered);
            
            // Si recordamos, intentar cargar el email guardado
            if (isRemembered) {
                const savedEmail = localStorage.getItem('remember_email');
                if (savedEmail) setEmail(savedEmail);
            }
        }
    }, []);

    // Guardar preferencia de "Recordarme" cada vez que cambie
    useEffect(() => {
        if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        persistTimerRef.current = setTimeout(() => {
            localStorage.setItem('remember_me', remember.toString());
            if (!remember) {
                localStorage.removeItem('remember_email');
            } else if (email) {
                localStorage.setItem('remember_email', email);
            }
        }, 500);
        return () => {
            if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        };
    }, [remember, email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            return;
        }

        try {
            await login({
                email,
                password,
                remember,
            });

            // Si el login fue exitoso y "Recordarme" está activo, guardar email
            if (remember) {
                localStorage.setItem('remember_email', email);
            }
        } catch (err) {
            console.error('Login error:', err);
        }
    };

    return {
        email,
        setEmail,
        password,
        setPassword,
        showPassword,
        setShowPassword,
        remember,
        setRemember,
        isLoading,
        error,
        handleSubmit,
    };
}
