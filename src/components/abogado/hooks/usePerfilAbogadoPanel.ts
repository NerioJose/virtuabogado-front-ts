import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { lawyersService } from '@/features/lawyers/services/lawyers.service';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function usePerfilAbogadoPanel(abogado: any) {
    const supabase = createClient();
    const { updateUser } = useAuthStore();
    const [editando, setEditando] = useState(false);
    const [datosEditados, setDatosEditados] = useState({
        nombre: abogado.nombre,
        email: abogado.email,
        telefono: abogado.telefono,
        especialidad: abogado.especialidad,
    });
    const [guardando, setGuardando] = useState(false);
    const [exito, setExito] = useState(false);
    const { changePassword, isLoading: cambiandopassword } = useAuth();
    const [passwords, setPasswords] = useState({
        actual: '',
        nueva: '',
        confirmar: ''
    });

    const [notificacion, setNotificacion] = useState<{tipo: 'success' | 'info' | 'error', mensaje: string} | null>(null);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setDatosEditados(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFotoClick = () => {
        document.getElementById('foto-input')?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setNotificacion({ tipo: 'info', mensaje: 'Subiendo foto de perfil...' });

            const fileExt = file.name.split('.').pop();
            const fileName = `${abogado.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            await lawyersService.update(abogado.id, { picture: publicUrl });
            updateUser({ picture: publicUrl });
            
            setNotificacion({ tipo: 'success', mensaje: 'Foto de perfil actualizada correctamente' });
        } catch (error: any) {
            console.error('Error al subir foto:', error);
            setNotificacion({ tipo: 'error', mensaje: `Error: ${error.message || 'No se pudo subir la foto'}` });
        }
    };

    useEffect(() => {
        if (notificacion) {
            const timer = setTimeout(() => setNotificacion(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notificacion]);

    const guardarCambios = async () => {
        setGuardando(true);

        try {
            await lawyersService.update(abogado.id, {
                nombre: datosEditados.nombre,
                telefono: datosEditados.telefono,
                especialidad: datosEditados.especialidad as any,
            });

            updateUser({ 
                nombre: datosEditados.nombre,
                telefono: datosEditados.telefono,
                especialidad: datosEditados.especialidad as any
            });

            setExito(true);
            setEditando(false);

            setTimeout(() => setExito(false), 3000);
        } catch (error) {
            console.error('Error al guardar cambios:', error);
            setNotificacion({ tipo: 'error', mensaje: 'Error al actualizar el perfil' });
        } finally {
            setGuardando(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.nueva !== passwords.confirmar) {
            setNotificacion({ tipo: 'error', mensaje: 'Las nuevas contraseñas no coinciden' });
            return;
        }
        if (passwords.nueva.length < 6) {
            setNotificacion({ tipo: 'error', mensaje: 'La contraseña debe tener al menos 6 caracteres' });
            return;
        }

        try {
            await changePassword(passwords.actual, passwords.nueva);
            setNotificacion({ tipo: 'success', mensaje: 'Contraseña actualizada correctamente' });
            setPasswords({ actual: '', nueva: '', confirmar: '' });
        } catch (error: any) {
            setNotificacion({ tipo: 'error', mensaje: error.message || 'Error al actualizar contraseña' });
        }
    };

    return {
        editando,
        setEditando,
        datosEditados,
        guardando,
        exito,
        cambiandopassword,
        passwords,
        setPasswords,
        notificacion,
        handleChange,
        handleFotoClick,
        handleFileChange,
        guardarCambios,
        handlePasswordChange,
    };
}
