'use client';

import { motion } from 'framer-motion';
import { FiShield, FiFileText, FiLock, FiAlertCircle } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';

export default function TerminosPage() {
    return (
        <main className="min-h-screen bg-slate-50 pt-32 pb-20 px-6">
            <div className="max-w-4xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 p-8 md:p-12 border border-slate-100"
                >
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-azul-primario/10 rounded-2xl mb-6">
                            <FiFileText className="text-azul-primario text-3xl" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Términos y Condiciones</h1>
                        <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">Última actualización: 3 de Abril, 2026</p>
                    </div>

                    <div className="prose prose-slate max-w-none space-y-8 text-slate-600 leading-relaxed">
                        <section>
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3 mb-4">
                                <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-sm font-bold">1</span>
                                Aceptación de Términos
                            </h2>
                            <p>
                                Al acceder y utilizar la plataforma de <strong>VirtuAbogado</strong>, usted acepta cumplir y estar sujeto a los siguientes términos y condiciones. Si no está de acuerdo con alguna parte de estos términos, le rogamos que no utilice nuestros servicios.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3 mb-4">
                                <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-sm font-bold">2</span>
                                Naturaleza del Servicio
                            </h2>
                            <p>
                                VirtuAbogado es una plataforma digital que facilita la asesoría legal online. La asesoría prestada a través de la plataforma constituye una orientación profesional basada en la información proporcionada por el cliente. No garantiza resultados específicos en procesos judiciales o administrativos.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3 mb-4">
                                <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-sm font-bold">3</span>
                                Pagos y Reembolsos
                            </h2>
                            <p>
                                Los pagos son procesados de forma segura a través de nuestro aliado <strong>Zenobank</strong>. 
                                Una vez realizada la asesoría o iniciado el trabajo por parte de los abogados asignados, no se realizarán reembolsos a menos que se demuestre una falla técnica imputable a la plataforma.
                            </p>
                            <div className="bg-blue-50 border-l-4 border-azul-primario p-4 rounded-r-xl flex gap-4 mt-4">
                                <FiAlertCircle className="text-azul-primario text-xl shrink-0 mt-1" />
                                <p className="text-sm">
                                    Los precios están sujetos a cambios sin previo aviso, pero se respetarán los precios de las órdenes ya pagadas.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3 mb-4">
                                <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-sm font-bold">4</span>
                                Propiedad Intelectual
                            </h2>
                            <p>
                                Todo el contenido presente en esta plataforma, incluyendo logos, diseños, textos y software, es propiedad de VirtuAbogado o sus licenciantes y está protegido por leyes de propiedad intelectual internacionales.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3 mb-4">
                                <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-sm font-bold">5</span>
                                Limitación de Responsabilidad
                            </h2>
                            <p>
                                VirtuAbogado no se hace responsable por daños indirectos, incidentales o consecuentes derivados del uso de la plataforma o la imposibilidad de acceder a ella.
                            </p>
                        </section>
                    </div>

                    <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                        <Link href="/" className="text-azul-primario font-bold hover:underline flex items-center gap-2">
                            ← Volver al inicio
                        </Link>
                        <p className="text-slate-400 text-sm italic">
                            Si tiene dudas, escríbanos a virtuabogado.legal@gmail.com
                        </p>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
