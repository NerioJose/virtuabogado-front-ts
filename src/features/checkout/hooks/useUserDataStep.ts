import { useState, useEffect } from 'react';
import { useCheckout } from './useCheckout';

export const useUserDataStep = () => {
    const { 
        userData: storeUserData,
        setUserData, 
        isLoading, 
        error: storeError,
        isExistingUser, 
        checkUserExists, 
        authenticateUser 
    } = useCheckout();

    // Estados Locales
    const [email, setEmail] = useState(storeUserData?.email || '');
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);

    const [formData, setFormData] = useState({
        password: '',
        name: storeUserData?.nombre || storeUserData?.name || '',
        phone: storeUserData?.phone || '',
    });

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

    // Debounce para verificación de Email
    useEffect(() => {
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        
        if (!isValidEmail) {
            setHasChecked(false);
            return;
        }

        const timer = setTimeout(async () => {
            if (hasChecked && storeUserData?.email === email) return;

            setIsCheckingEmail(true);
            setLocalError(null);
            try {
                await checkUserExists(email);
                setHasChecked(true);
            } catch (err) {
                console.error('Error checking email:', err);
            } finally {
                setIsCheckingEmail(false);
            }
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
        if (localError) setLocalError(null);
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
            createAccount: !isExistingUser
        });

        if (!success) {
            setLocalError('Error de autenticación. Verifique sus datos.');
        }
    };

    const handleResetEmail = () => {
        setHasChecked(false);
        setEmail('');
        setFormData({ password: '', name: '', phone: '' });
    };

    const handleResetPassword = async () => {
        if (!email) return;
        try {
            const { createClient } = await import('@/utils/supabase/client');
            const supabase = createClient();
            await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/perfil/seguridad`
            });
            setShowResetModal(true);
        } catch (err) {
            console.error('Error reset password:', err);
            setLocalError('No se pudo enviar el enlace de recuperación.');
        }
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
        isLoading,
        isExistingUser,

        // Actions
        handleInputChange,
        handleEmailChange,
        handleSubmit,
        handleResetEmail,
        handleResetPassword
    };
};
