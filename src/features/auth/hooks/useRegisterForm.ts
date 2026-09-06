import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { UserRole } from '@/shared/types/entities.types';

const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function useRegisterForm(defaultRole: UserRole = UserRole.CLIENTE) {
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        confirmPassword: '',
        telefono: '',
        rol: defaultRole,
    });
    const [remember, setRemember] = useState(true);
    const [passwordError, setPasswordError] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);
    const [turnstileToken, setTurnstileToken] = useState('');
    const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const persistTimerRef = useRef<NodeJS.Timeout | null>(null);

    const { register, isLoading, error } = useAuth();

    // Limpiar intervalos al desmontar
    useEffect(() => {
        return () => {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
        };
    }, []);

    // Cargar preferencia y datos al montar
    useEffect(() => {
        const savedRemember = localStorage.getItem('remember_me');
        if (savedRemember !== null) {
            const isRemembered = savedRemember === 'true';
            setRemember(isRemembered);
            
            if (isRemembered) {
                const savedEmail = localStorage.getItem('remember_email');
                const savedNombre = localStorage.getItem('remember_nombre');
                const savedTelefono = localStorage.getItem('remember_telefono');
                
                setFormData(prev => ({
                    ...prev,
                    email: savedEmail || prev.email,
                    nombre: savedNombre || prev.nombre,
                    telefono: savedTelefono || prev.telefono
                }));
            }
        }
    }, []);

    // Guardar preferencia y limpiar si es necesario
    useEffect(() => {
        if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        persistTimerRef.current = setTimeout(() => {
            localStorage.setItem('remember_me', remember.toString());
            if (!remember) {
                localStorage.removeItem('remember_email');
                localStorage.removeItem('remember_nombre');
                localStorage.removeItem('remember_telefono');
            } else {
                if (formData.email) localStorage.setItem('remember_email', formData.email);
                if (formData.nombre) localStorage.setItem('remember_nombre', formData.nombre);
                if (formData.telefono) localStorage.setItem('remember_telefono', formData.telefono);
            }
        }, 500);
        return () => {
            if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        };
    }, [remember, formData.email, formData.nombre, formData.telefono]);

    const startResendCooldown = () => {
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        if (cooldownRef.current) clearInterval(cooldownRef.current);
        cooldownRef.current = setInterval(() => {
            setResendCooldown((prev) => {
                if (prev <= 1) {
                    if (cooldownRef.current) clearInterval(cooldownRef.current);
                    cooldownRef.current = null;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Chequeo en vivo de deliverabilidad del email (formato + desechable + MX)
    useEffect(() => {
        const email = formData.email.trim();

        if (!email) {
            setEmailError(null);
            return;
        }
        if (!EMAIL_PATTERN.test(email)) {
            setEmailError('Ingresa un correo electrónico válido.');
            return;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/auth/validate-email?email=${encodeURIComponent(email)}`);
                const data = await res.json().catch(() => ({}));
                if (!cancelled) setEmailError(data?.ok ? null : (data?.error || 'Correo no válido'));
            } catch (err) {
                console.error('Error validando email:', err);
                if (!cancelled) setEmailError(null);
            }
        }, 700);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [formData.email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');

        // Validar que las contraseñas coincidan
        if (formData.password !== formData.confirmPassword) {
            setPasswordError('Las contraseñas no coinciden');
            return;
        }

        try {
            const result = await register({
                nombre: formData.nombre,
                email: formData.email,
                password: formData.password,
                telefono: formData.telefono,
                rol: formData.rol,
                remember: remember,
                turnstileToken
            });

            if (result?.requiresEmailConfirmation) {
                setAwaitingConfirmation(true);
            }
        } catch (err) {
            console.error('Register error:', err);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (field === 'email') {
            setEmailError(null);
            if (awaitingConfirmation) {
                setAwaitingConfirmation(false);
            }
        }
    };

    const handleResendConfirmation = async () => {
        if (resendCooldown > 0) return;
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    rol: formData.rol,
                    turnstileToken
                })
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'No se pudo reenviar el correo');
            }
            startResendCooldown();
        } catch (err) {
            console.error('Resend error:', err);
        }
    };

    return {
        formData,
        remember,
        setRemember,
        passwordError,
        emailError,
        isLoading,
        error,
        turnstileToken,
        setTurnstileToken,
        awaitingConfirmation,
        resendCooldown,
        handleSubmit,
        handleChange,
        handleResendConfirmation,
    };
}