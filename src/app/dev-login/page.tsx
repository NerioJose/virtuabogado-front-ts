'use client';

/**
 * PÁGINA DE DESARROLLO - Solo para testing
 * Permite login rápido con diferentes roles sin backend
 * ELIMINAR EN PRODUCCIÓN
 */

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiShield, FiUser, FiUsers } from 'react-icons/fi';
import { useAuthStore } from '@/features/auth/store/authStore';
import { UserRole } from '@/shared/types/entities.types';

export default function DevLoginPage() {
    const router = useRouter();
    const { setUser, logout } = useAuthStore();

    const loginAs = (role: 'admin' | 'abogado' | 'cliente') => {
        const users = {
            admin: {
                id: 1,
                email: 'admin@virtuabogado.com',
                nombre: 'Admin Principal',
                rol: UserRole.ADMIN,
                picture: '/user.png',
            },
            abogado: {
                id: 2,
                email: 'abogado@virtuabogado.com',
                nombre: 'Dr. Juan Pérez',
                rol: UserRole.ABOGADO,
                especialidad: 'Derecho Civil',
                numeroColegiado: 'ABC123',
                experienciaAnios: 10,
                picture: '/user.png',
            },
            cliente: {
                id: 3,
                email: 'cliente@example.com',
                nombre: 'María González',
                rol: UserRole.CLIENTE,
                picture: '/user.png',
            },
        };

        // Usar authStore en lugar de localStorage directo
        setUser(users[role]);

        // Redirigir según rol
        const redirects = {
            admin: '/admin',
            abogado: '/abogado',
            cliente: '/mis-servicios',
        };

        router.push(redirects[role]);
    };

    const clearAuth = () => {
        logout();
        router.push('/');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8 md:p-10 w-full max-w-2xl">
                {/* Warning Header */}
                <div className="bg-red-100 border-2 border-red-500 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <h2 className="text-xl font-bold text-red-600">
                            PÁGINA DE DESARROLLO
                        </h2>
                    </div>
                    <p className="text-sm text-red-700">
                        Esta página es solo para testing. <strong>ELIMINAR EN PRODUCCIÓN.</strong>
                    </p>
                </div>

                <h1 className="text-3xl font-bold text-azul-primario mb-2">
                    Login Rápido para Testing
                </h1>
                <p className="text-gray-600 mb-8">
                    Selecciona un rol para hacer login instantáneo sin backend
                </p>

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                    {/* Admin */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => loginAs('admin')}
                        className="p-6 bg-gradient-to-br from-vinotinto to-red-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all">
                        <FiShield className="w-12 h-12 mx-auto mb-3" />
                        <h3 className="font-bold text-xl mb-1">Admin</h3>
                        <p className="text-sm opacity-90">Admin Principal</p>
                        <p className="text-xs opacity-75 mt-2">admin@virtuabogado.com</p>
                    </motion.button>

                    {/* Abogado */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => loginAs('abogado')}
                        className="p-6 bg-gradient-to-br from-azul-primario to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all">
                        <FiUser className="w-12 h-12 mx-auto mb-3" />
                        <h3 className="font-bold text-xl mb-1">Abogado</h3>
                        <p className="text-sm opacity-90">Dr. Juan Pérez</p>
                        <p className="text-xs opacity-75 mt-2">abogado@virtuabogado.com</p>
                    </motion.button>

                    {/* Cliente */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => loginAs('cliente')}
                        className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all">
                        <FiUsers className="w-12 h-12 mx-auto mb-3" />
                        <h3 className="font-bold text-xl mb-1">Cliente</h3>
                        <p className="text-sm opacity-90">María González</p>
                        <p className="text-xs opacity-75 mt-2">cliente@example.com</p>
                    </motion.button>
                </div>

                <div className="border-t pt-6 space-y-3">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={clearAuth}
                        className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all">
                        Cerrar sesión / Limpiar auth
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push('/')}
                        className="w-full px-6 py-3 border-2 border-azul-primario text-azul-primario rounded-xl font-semibold hover:bg-azul-claro/20 transition-all">
                        Volver al home
                    </motion.button>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2">📋 Rutas de cada rol:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li><strong>Admin:</strong> /admin</li>
                        <li><strong>Abogado:</strong> /abogado</li>
                        <li><strong>Cliente:</strong> /mis-servicios, /clientes</li>
                    </ul>
                </div>
            </motion.div>
        </div>
    );
}
