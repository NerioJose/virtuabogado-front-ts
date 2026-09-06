import { useState, useEffect, useRef } from 'react';
import { useCheckout } from './useCheckout';

const RESEND_COOLDOWN_SECONDS = 60;

export const useUserDataStep = () => {
    const {
        userData: storeUserData,
        setUserData,
        isLoading,
        error: storeError,
        isExistingUser,
        requiresEmailConfirmation,
        checkUserExists,
        clearEmailConfirmation,
        clearError,
        authenticateUser,
        resendConfirmation
    } = useCheckout();

    // Estados Locales
    const [email, setEmail] = useState(storeUserData?.email || '');
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');
    const [emailError, setEmailError] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [captchaAttempt, setCaptchaAttempt] = useState(0);
    const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [formData, setFormData] = useState({
        password: '',
        name: storeUserData?.nombre || storeUserData?.name || '',
        phone: storeUserData?.phone || '',
    });

    // Contador de espera tras reenviar el correo de confirmación
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

    // Limpiar intervalos al desmontar
    useEffect(() => {
        return () => {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
        };
    }, []);

    // Sincronizar formData local con el store
    useEffect(() => {
        if (storeUserData) {
            setFormData(prev => ({
                ...prev,
                name: storeUserData.nombre || storeUserData.name || prev.name,
                phone: storeUserData.phone || prev.phone,
            }));
        }
    }, [storeUserData]);

    // Debounce para verificación de Email (usuario existente + deliverabilidad MX)
    useEffect(() => {
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        if (!isValidEmail) {
            setHasChecked(false);
            setEmailError(null);
            return;
        }

        const timer = setTimeout(async () => {
            if (hasChecked && storeUserData?.email === email) return;

            setIsCheckingEmail(true);
            setLocalError(null);

            // 1. Verificar si el usuario existe (login vs registro)
            let userExists = false;
            try {
                userExists = await checkUserExists(email);
                setHasChecked(true);
            } catch (err) {
                console.error('Error checking email:', err);
            }

            // 2. Verificación en vivo de deliverabilidad (formato + desechable + MX)
            try {
                const res = await fetch(`/api/auth/validate-email?email=${encodeURIComponent(email)}`);
                const data = await res.json().catch(() => ({}));
                setEmailError(data?.ok ? null : (data?.error || null));
            } catch (err) {
                console.error('Error validando email:', err);
                setEmailError(null);
            }

            if (userExists) setEmailError(null);
            setIsCheckingEmail(false);
        }, 800);

        return () => clearTimeout(timer);
    }, [email, checkUserExists, hasChecked, storeUserData?.email]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (localError) setLocalError(null);
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        setEmailError(null);
        if (localError) setLocalError(null);
        if (requiresEmailConfirmation) clearEmailConfirmation();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isExistingUser && !formData.password) {
            setLocalError('Por favor, ingrese su contraseña.');
            return;
        }
        if (!isExistingUser && (!formData.name || !formData.password)) {
            setLocalError('Por favor, complete todos los campos requeridos (*).');
            return;
        }

        const success = await authenticateUser({
            email,
            password: formData.password,
            name: formData.name,
            nombre: formData.name,
            phone: formData.phone,
            createAccount: !isExistingUser,
            turnstileToken
        });

        if (!success) {
            setLocalError('Error de autenticación. Verifique sus datos.');
        }
    };

    const handleResetEmail = () => {
        clearEmailConfirmation();
        setHasChecked(false);
        setEmailError(null);
        setEmail('');
        setFormData({ password: '', name: '', phone: '' });
    };

    const handleResetPassword = async () => {
        if (!email) return;
        try {
            const res = await fetch('/api/auth/reset-password/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Error al enviar el correo');
            }
            setShowResetModal(true);
        } catch (err) {
            console.error('Error reset password:', err);
            setLocalError(err instanceof Error ? err.message : 'No se pudo enviar el enlace de recuperación.');
        }
    };

    const handleResendConfirmation = async () => {
        if (resendCooldown > 0 || !email) return;
        setLocalError(null);
        try {
            await resendConfirmation(email, formData.password, turnstileToken);
            startResendCooldown();
        } catch (err) {
            setLocalError(err instanceof Error ? err.message : 'No se pudo reenviar el correo.');
        }
    };

    // Reintentar verificación anti-bot: limpia el error y renueva el captcha
    const handleRetryHumanCheck = () => {
        clearError();
        setLocalError(null);
        setTurnstileToken('');
        setCaptchaAttempt((prev) => prev + 1);
    };

    const displayError = localError || storeError;

    return {
        // State
        email,
        isCheckingEmail,
        hasChecked,
        showPassword,
        setShowPassword,
        showResetModal,
        setShowResetModal,
        formData,
        displayError,
        emailError,
        isLoading,
        isExistingUser,
        requiresEmailConfirmation,
        turnstileToken,
        setTurnstileToken,
        resendCooldown,
        captchaAttempt,

        // Actions
        handleInputChange,
        handleEmailChange,
        handleSubmit,
        handleResetEmail,
        handleResetPassword,
        handleResendConfirmation,
        handleRetryHumanCheck
    };
};