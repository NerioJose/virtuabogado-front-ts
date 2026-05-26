import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { UserRole } from '@/shared/types/entities.types';

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

    const persistTimerRef = useRef<NodeJS.Timeout | null>(null);

    const { register, isLoading, error } = useAuth();

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');

        // Validar que las contraseñas coincidan
        if (formData.password !== formData.confirmPassword) {
            setPasswordError('Las contraseñas no coinciden');
            return;
        }

        try {
            await register({
                nombre: formData.nombre,
                email: formData.email,
                password: formData.password,
                telefono: formData.telefono,
                rol: formData.rol,
                remember: remember,
            });
        } catch (err) {
            console.error('Register error:', err);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    return {
        formData,
        remember,
        setRemember,
        passwordError,
        isLoading,
        error,
        handleSubmit,
        handleChange,
    };
}
