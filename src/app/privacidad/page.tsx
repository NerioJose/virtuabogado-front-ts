'use client';

import { motion } from 'framer-motion';
import { FiShield, FiLock, FiEye, FiCheckCircle } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';

export default function PrivacidadPage() {
    return (
        <main className="min-h-screen bg-slate-50 pt-32 pb-20 px-6">
            <div className="max-w-4xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 p-8 md:p-12 border border-slate-100 overflow-hidden relative"
                >
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-6">
                            <FiShield className="text-green-600 text-3xl" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Política de Privacidad</h1>
                        <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">Respetando tu información personal.</p>
                    </div>

                    <div className="prose prose-slate max-w-none space-y-8 text-slate-600 leading-relaxed">
                        <section>
                            <h2 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">
                                1. Información que Recopilamos
                            </h2>
                            <p>
                                VirtuAbogado recopila los datos personales que usted proporciona directamente al momento de registrarse, solicitar asesoría o realizar un pago:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Datos de Identificación</strong>: Nombre, apellido, correo electrónico, documento de identidad.</li>
                                <li><strong>Datos de Pago</strong>: Información transaccional gestionada por nuestros aliados (Zenobank), garantizando que no almacenamos sus tarjetas de crédito directamente en nuestros servidores.</li>
                                <li><strong>Datos de Comunicación</strong>: Contenido de los chats, archivos adjuntos y mensajes relacionados con las asesorías legales.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">
                                2. Uso de la Información
                            </h2>
                            <p>
                                Su información se utiliza únicamente para los siguientes fines:
                            </p>
                            <ul className="list-decimal pl-6 space-y-2">
                                <li>Facilitar y gestionar las asesorías legales solicitadas.</li>
                                <li>Poder comunicarnos con usted en relación con sus trámites legales.</li>
                                <li>Cumplir con las obligaciones fiscales y legales vigentes.</li>
                                <li>Mejorar la experiencia de usuario y la calidad de nuestros servicios legales.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">
                                3. Almacenamiento y Seguridad
                            </h2>
                            <p>
                                Sus datos están alojados en centros de datos seguros mediante nuestro proveedor de infraestructura <strong>Supabase</strong>. Implementamos medidas técnicas, administrativas y físicas para proteger la confidencialidad de su información personal.
                            </p>
                            <div className="bg-green-50 border-2 border-green-100 rounded-2xl p-6 mt-4 flex gap-4">
                                <FiLock className="text-green-600 text-2xl shrink-0" />
                                <div>
                                    <h4 className="text-green-800 font-bold mb-1">Cifrado de Extremo a Extremo</h4>
                                    <p className="text-sm text-green-700/80">Sus comunicaciones con los abogados son privadas y están protegidas por capas de seguridad industrial.</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">
                                4. Derechos ARCO
                            </h2>
                            <p>
                                Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales. Puede ejercer estos derechos enviando una solicitud formal a nuestro oficial de privacidad en virtuabogado.legal@gmail.com.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 border-b pb-2 mb-4">
                                5. Cookies y Rastreo
                            </h2>
                            <p>
                                Utilizamos cookies técnicas esenciales para mantener su sesión iniciada y proporcionar funcionalidades básicas del sistema. No utilizamos cookies para rastreo publicitario de terceros.
                            </p>
                        </section>
                    </div>

                    <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                        <Link href="/" className="text-azul-primario font-bold hover:underline">
                            ← Volver al inicio
                        </Link>
                        <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
                            <FiCheckCircle />
                            Su privacidad es nuestra prioridad
                        </div>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
