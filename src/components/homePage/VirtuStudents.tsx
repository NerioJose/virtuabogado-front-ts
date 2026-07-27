'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useServices } from '@/features/services/hooks/useServices';
import { useServicesRealtime } from '@/features/services/hooks/useServicesRealtime';
import { useServicesStore } from '@/features/services/store/servicesStore';
import { useCheckout } from '@/features/checkout';
import { FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import { formatUSD } from '@/lib/finance';

export default function VirtuStudents() {
    const { isLoading } = useServices(); // Mantener para el fetch inicial
    useServicesRealtime(); // Activar tiempo real para esta sección
    const activeServices = useServicesStore(state => state.activeServices);
    const { openCheckout } = useCheckout();
    
    // Búsqueda inteligente del servicio académico (VirtuStudents)
    const studentService = (activeServices || []).find(s => {
        // Criterio 1: Por URL de imagen (el más estable)
        if (s.imagenUrl && s.imagenUrl.toLowerCase().includes('virtustudents')) return true;
        
        // Criterio 2: Por palabras clave en el título
        const titulo = s.titulo.toLowerCase();
        return titulo.includes('estudiantes') || titulo.includes('academia') || titulo.includes('estudiante');
    });

    // Si no hay datos, está cargando o el servicio no está activo, no mostrar nada
    if (isLoading || !studentService) return null;

    const price = formatUSD(studentService.precio);
    const title = studentService.titulo;
    const description = studentService.descripcion;

    return (
        <section className="py-24 bg-gray-50/30 overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="text-vinotinto font-black uppercase tracking-widest text-sm mb-2 block"
                    >
                        Academia & Excelencia
                    </motion.span>
                    <h2 className="text-4xl md:text-5xl font-bold text-azul-primario mb-4">
                        Sección <span className="text-vinotinto italic">VirtuStudents</span>
                    </h2>
                    <p className="text-gray-500 max-w-2xl mx-auto text-lg font-light leading-relaxed">
                        Formación estratégica y mentoría de alto nivel para los futuros juristas del país.
                    </p>
                </div>

                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className="group bg-white rounded-[40px] shadow-xl hover:shadow-2xl transition duration-700 border border-gray-100 relative overflow-hidden flex flex-col lg:flex-row items-stretch"
                    >
                        <div className="absolute top-0 left-0 w-2 h-full bg-vinotinto scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-700"></div>

                        <div className="w-full lg:w-1/2 relative min-h-[400px] overflow-hidden">
                            <Image
                                src="/images/virtustudents.jpg"
                                alt="Estudiantes de Derecho"
                                fill
                                sizes="100vw"
                                className="object-cover transform group-hover:scale-105 transition-transform duration-1000"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>

                            <div className="absolute bottom-8 left-8 p-6 glass-card border-white/20">
                                <p className="text-white text-sm font-light italic">
                                    "La mentoría es el puente entre la teoría y la práctica de excelencia."
                                </p>
                            </div>
                        </div>

                        <div className="w-full lg:w-1/2 p-10 md:p-16 flex flex-col justify-center space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-4xl font-black text-azul-primario leading-tight">
                                    {title}
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {['Tutorías', 'Casos Reales', 'Estudiantes'].map((tag) => (
                                        <span key={tag} className="px-3 py-1 bg-azul-claro text-azul-primario text-[10px] font-black uppercase tracking-widest rounded-full">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <p className="text-gray-600 text-lg font-light leading-relaxed">
                                {description}
                            </p>

                            <ul className="space-y-3">
                                {[
                                    'Análisis de casos prácticos reales',
                                    'Tutorías personalizadas senior',
                                    'Material de apoyo exclusivo'
                                ].map((item, i) => (
                                    <li key={item} className="flex items-center gap-3 text-gray-700 font-medium text-sm">
                                        <FiCheckCircle className="text-vinotinto" /> {item}
                                    </li>
                                ))}
                            </ul>

                            <div className="flex flex-col sm:flex-row items-center gap-10 pt-6">
                                <motion.button
                                    onClick={() => openCheckout(studentService)}
                                    className="btn-primary flex items-center gap-3 group/btn px-10"
                                >
                                    Solicitar Tutoría
                                    <FiArrowRight className="group-hover/btn:translate-x-1 transition-transform" />
                                </motion.button>

                                <div className="flex flex-col border-l border-gray-100 pl-8">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inversión Alumno</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-vinotinto">{price}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
