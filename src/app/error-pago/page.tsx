'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
	FiAlertCircle,
	FiCreditCard,
	FiRefreshCw,
	FiArrowLeft,
	FiHelpCircle,
} from 'react-icons/fi';
// Las imágenes en /public se sirven desde la raíz / en Next.js. No es necesario importarlas como módulos para el componente Image.
import { logAbandonment } from '@/lib/utils/analytics';
import { saveCartData } from '@/lib/utils/cartRecovery';


import { Suspense } from 'react';

// Interfaz para los datos del servicio
interface ServiceData {
	id: string;
	nombre: string;
	descripcion: string;
	precio: number;
	precioFormateado?: string;
}

function ErrorPagoContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [errorCode, setErrorCode] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string>(
		'Ha ocurrido un problema al procesar tu pago'
	);
	const [serviceData, setServiceData] = useState<ServiceData | null>(null);

	useEffect(() => {
		// Obtener código de error y datos del servicio de los parámetros de URL
		const code = searchParams?.get('error');
		const serviceId = searchParams?.get('serviceId');
		const serviceName = searchParams?.get('serviceName');

		if (code) {
			setErrorCode(code);

			// Personalizar mensaje según el código de error
			if (code === 'insufficient_funds') {
				setErrorMessage(
					'No se ha podido completar el pago por fondos insuficientes'
				);
			} else if (code === 'card_declined') {
				setErrorMessage('La tarjeta ha sido rechazada por la entidad bancaria');
			} else if (code === 'invalid_card') {
				setErrorMessage('Los datos de la tarjeta no son válidos');
			}
		}

		// Intentar recuperar datos del servicio del localStorage
		try {
			const storedService = localStorage.getItem('currentService');
			if (storedService) {
				const parsedService = JSON.parse(storedService);
				setServiceData(parsedService);

				// Guardar datos para recuperación de carrito
				saveCartData(parsedService);
			}
		} catch (error) {
			console.error('Error al recuperar datos del servicio:', error);
		}

		// Registrar el abandono para análisis
		logAbandonment({
			page: 'payment',
			reason: 'payment_error',
			errorCode: code || 'unknown',
			serviceId: serviceId || undefined,
			serviceName: serviceName || undefined,
		});
	}, [searchParams]);

	// Función para volver a intentar el pago
	const handleReintentar = () => {
		router.push('/servicios');
	};

	// Función para solicitar ayuda
	const solicitarAyuda = () => {
		// En una implementación real, esto podría abrir un chat de soporte
		// o redirigir a una página de contacto con los detalles prellenados
		router.push(
			'/contacto?motivo=error_pago&codigo=' + (errorCode || 'desconocido')
		);
	};

	return (
		<main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-3xl mx-auto">
				<div className="text-center mb-8">
					<Link
						href="/"
						className="inline-block">
						<Image
							src="/logo/logo_sf_1.png"
							alt="VirtuAbogado Logo"
							width={180}
							height={60}
							className="mx-auto"
						/>
					</Link>
				</div>

				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.5 }}
					className="bg-white shadow-lg rounded-xl overflow-hidden mb-8">
					<div className="bg-red-50 p-8 text-center border-b border-red-100">
						<div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
							<FiAlertCircle className="h-8 w-8 text-red-600" />
						</div>
						<h1 className="text-2xl font-bold text-gray-900 mb-2">
							No se ha podido completar el pago
						</h1>
						<p className="text-gray-600">
							{errorMessage}
							{errorCode && (
								<span className="block text-sm mt-1 text-gray-500">
									Código de error: {errorCode}
								</span>
							)}
						</p>
					</div>

					{serviceData && (
						<div className="p-4 bg-gray-50 border-b border-gray-200">
							<h3 className="text-sm font-medium text-gray-500 mb-2">
								Servicio seleccionado:
							</h3>
							<div className="flex justify-between items-center">
								<div>
									<p className="font-medium text-gray-900">
										{serviceData.nombre}
									</p>
									<p className="text-sm text-gray-600">
										{serviceData.descripcion}
									</p>
								</div>
								<p className="font-bold text-azul-primario">
									{typeof serviceData.precio === 'number'
										? serviceData.precio.toLocaleString('es-ES', {
											style: 'currency',
											currency: 'EUR',
										})
										: serviceData.precio}
								</p>
							</div>
						</div>
					)}

					<div className="p-6">
						<div className="mb-8">
							<h2 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
								Posibles causas
							</h2>

							<ul className="space-y-3 text-gray-600">
								<li className="flex items-start">
									<FiCreditCard className="mt-1 mr-2 text-gray-400 flex-shrink-0" />
									<span>Fondos insuficientes en la tarjeta o cuenta</span>
								</li>
								<li className="flex items-start">
									<FiCreditCard className="mt-1 mr-2 text-gray-400 flex-shrink-0" />
									<span>Datos de la tarjeta incorrectos o incompletos</span>
								</li>
								<li className="flex items-start">
									<FiCreditCard className="mt-1 mr-2 text-gray-400 flex-shrink-0" />
									<span>
										La entidad bancaria ha rechazado la operación por motivos de
										seguridad
									</span>
								</li>
								<li className="flex items-start">
									<FiCreditCard className="mt-1 mr-2 text-gray-400 flex-shrink-0" />
									<span>Problemas de conexión durante el proceso de pago</span>
								</li>
							</ul>
						</div>

						<div className="mb-8">
							<h2 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
								¿Qué puedes hacer?
							</h2>

							<ul className="space-y-3 text-gray-600">
								<li className="flex items-start">
									<FiRefreshCw className="mt-1 mr-2 text-gray-400 flex-shrink-0" />
									<span>Intentar nuevamente con el mismo método de pago</span>
								</li>
								<li className="flex items-start">
									<FiCreditCard className="mt-1 mr-2 text-gray-400 flex-shrink-0" />
									<span>Probar con otra tarjeta o método de pago</span>
								</li>
								<li className="flex items-start">
									<FiHelpCircle className="mt-1 mr-2 text-gray-400 flex-shrink-0" />
									<span>
										Contactar con tu entidad bancaria para verificar si hay
										alguna restricción
									</span>
								</li>
							</ul>
						</div>

						<div className="bg-gray-50 p-4 rounded-lg mb-6">
							<p className="text-sm text-gray-600 italic">
								Si continúas teniendo problemas, por favor contacta con nuestro
								equipo de soporte a través del correo electrónico{' '}
								<span className="font-medium">soporte@virtuabogado.com</span> o
								llamando al <span className="font-medium">900 123 456</span>.
							</p>
						</div>
					</div>
				</motion.div>

				<div className="flex flex-col sm:flex-row gap-4 justify-center">
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={handleReintentar}
						className="btn-primary flex items-center justify-center">
						<FiRefreshCw className="mr-2" /> Intentar nuevamente
					</motion.button>
					<Link href="/servicios">
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							className="px-6 py-3 bg-white text-azul-primario border border-azul-primario rounded-xl hover:bg-azul-claro transition-all duration-300 flex items-center justify-center">
							<FiArrowLeft className="mr-2" /> Volver al resumen
						</motion.button>
					</Link>
				</div>

				<div className="text-center mt-6">
					<button
						onClick={solicitarAyuda}
						className="text-azul-primario hover:underline text-sm">
						¿Necesitas ayuda? Contacta con nuestro equipo de soporte
					</button>
				</div>
			</div>
		</main>
	);
}

export default function ErrorPagoPage() {
	return (
		<Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
			<ErrorPagoContent />
		</Suspense>
	);
}
