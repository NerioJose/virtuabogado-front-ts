'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
	FiCreditCard,
	FiDollarSign,
	FiArrowLeft,
	FiCheck,
	FiShield,
	FiLock,
	FiClock,
} from 'react-icons/fi';
import logo from '../../../public/logo/logo_sf_1.png';

// Tipos de datos
interface MetodoPago {
	id: string;
	nombre: string;
	icono: React.ReactNode;
	descripcion: string;
}

interface Servicio {
	id: number;
	nombre: string;
	descripcion: string;
	precio: number;
}

// Importar utilidades de recuperación de carrito y analítica
import { saveCartData } from '../../lib/utils/cartRecovery';
import { logAbandonment } from '../../lib/utils/analytics';

export default function PagoPage() {
	// Estado para el servicio seleccionado (simulado, vendría de la URL o contexto)
	const [servicio, setServicio] = useState<Servicio>({
		id: 1,
		nombre: 'Consulta Legal Virtual',
		descripcion:
			'Asesoría legal personalizada con un abogado especializado a través de videoconferencia.',
		precio: 99.99,
	});

	// Estado para el método de pago seleccionado
	const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState<
		string | null
	>(null);

	// Estado para el formulario de pago
	const [formData, setFormData] = useState({
		nombreTitular: '',
		numeroTarjeta: '',
		fechaExpiracion: '',
		cvv: '',
		email: '',
	});

	// Estado para errores del formulario
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Estado para el proceso de pago
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [pagoCompletado, setPagoCompletado] = useState(false);

	// Guardar datos del servicio en localStorage al cargar la página
	useEffect(() => {
		if (servicio) {
			localStorage.setItem('currentService', JSON.stringify(servicio));
		}
	}, [servicio]);

	// Métodos de pago disponibles
	const metodosPago: MetodoPago[] = [
		{
			id: 'tarjeta',
			nombre: 'Tarjeta de Crédito/Débito',
			icono: <FiCreditCard className="text-2xl" />,
			descripcion: 'Paga de forma segura con tu tarjeta de crédito o débito.',
		},
		{
			id: 'transferencia',
			nombre: 'Transferencia Bancaria',
			icono: <FiDollarSign className="text-2xl" />,
			descripcion: 'Realiza una transferencia desde tu cuenta bancaria.',
		},
		{
			id: 'paypal',
			nombre: 'PayPal',
			icono: (
				<Image
					src="/icons/paypal.svg"
					alt="PayPal"
					width={24}
					height={24}
				/>
			),
			descripcion: 'Paga de forma rápida y segura con tu cuenta de PayPal.',
		},
	];

	// Manejador de cambio de método de pago
	const handleMetodoPagoChange = (id: string) => {
		setMetodoPagoSeleccionado(id);
		// Limpiar errores al cambiar de método
		setErrors({});
	};

	// Manejador de cambio en los campos del formulario
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;

		// Formateo específico para ciertos campos
		let formattedValue = value;

		if (name === 'numeroTarjeta') {
			// Formatear número de tarjeta (solo números y espacios cada 4 dígitos)
			formattedValue = value
				.replace(/\D/g, '')
				.replace(/(\d{4})(?=\d)/g, '$1 ')
				.trim()
				.substring(0, 19); // 16 dígitos + 3 espacios
		} else if (name === 'fechaExpiracion') {
			// Formatear fecha de expiración (MM/YY)
			formattedValue = value
				.replace(/\D/g, '')
				.replace(/(\d{2})(?=\d)/g, '$1/')
				.trim()
				.substring(0, 5);
		} else if (name === 'cvv') {
			// Solo permitir números para el CVV
			formattedValue = value.replace(/\D/g, '').substring(0, 4);
		}

		setFormData({
			...formData,
			[name]: formattedValue,
		});

		// Limpiar error cuando el usuario comienza a escribir
		if (errors[name]) {
			setErrors({
				...errors,
				[name]: '',
			});
		}
	};

	// Validación del formulario
	const validarFormulario = () => {
		const newErrors: Record<string, string> = {};

		if (metodoPagoSeleccionado === 'tarjeta') {
			if (!formData.nombreTitular.trim()) {
				newErrors.nombreTitular = 'El nombre del titular es obligatorio';
			}

			if (!formData.numeroTarjeta.trim()) {
				newErrors.numeroTarjeta = 'El número de tarjeta es obligatorio';
			} else if (formData.numeroTarjeta.replace(/\s/g, '').length !== 16) {
				newErrors.numeroTarjeta = 'El número de tarjeta debe tener 16 dígitos';
			}

			if (!formData.fechaExpiracion.trim()) {
				newErrors.fechaExpiracion = 'La fecha de expiración es obligatoria';
			} else if (!/^\d{2}\/\d{2}$/.test(formData.fechaExpiracion)) {
				newErrors.fechaExpiracion = 'Formato inválido. Usa MM/YY';
			}

			if (!formData.cvv.trim()) {
				newErrors.cvv = 'El código de seguridad es obligatorio';
			} else if (formData.cvv.length < 3) {
				newErrors.cvv = 'El código de seguridad debe tener al menos 3 dígitos';
			}
		}

		if (!formData.email.trim()) {
			newErrors.email = 'El correo electrónico es obligatorio';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			newErrors.email = 'Ingresa un correo electrónico válido';
		}

		return newErrors;
	};

	// Manejador de envío del formulario
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validar que se haya seleccionado un método de pago
		if (!metodoPagoSeleccionado) {
			setErrors({
				form: 'Por favor, selecciona un método de pago',
			});
			return;
		}

		// Validar formulario
		const newErrors = validarFormulario();
		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return;
		}

		// Procesar pago
		setIsSubmitting(true);

		try {
			// Aquí iría la llamada a la API para procesar el pago
			// Por ahora, simulamos una respuesta después de 2 segundos
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Simulación de éxito/error (80% de éxito)
			const isSuccess = Math.random() > 0.2;

			if (isSuccess) {
				// Limpiar datos del servicio actual
				localStorage.removeItem('currentService');

				setPagoCompletado(true);
			} else {
				// Registrar abandono por error de pago
				logAbandonment({
					page: 'payment',
					reason: 'payment_error',
					errorCode: 'random_failure',
					serviceId: servicio.id.toString(),
					serviceName: servicio.nombre,
				});

				// Guardar datos para recuperación de carrito
				saveCartData(servicio);

				// Redirigir a página de error
				window.location.href = '/error-pago?error=random_failure';
			}
		} catch (error) {
			console.error('Error al procesar el pago:', error);
			setErrors({
				form: 'Ocurrió un error al procesar el pago. Por favor, inténtalo de nuevo más tarde.',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	// Renderizado condicional según el estado del pago
	if (pagoCompletado) {
		return (
			<main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
				<div className="max-w-md w-full space-y-8">
					<div className="text-center">
						<Link
							href="/"
							className="inline-block">
							<Image
								src={logo}
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
						className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
						<div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
							<FiCheck className="h-8 w-8 text-green-600" />
						</div>
						<h2 className="text-2xl font-bold text-gray-900 mb-2">
							¡Pago completado!
						</h2>
						<p className="text-gray-600 mb-6">
							Tu pago por{' '}
							<span className="font-semibold">{servicio.nombre}</span> ha sido
							procesado correctamente.
						</p>

						<div className="bg-gray-50 p-4 rounded-lg mb-6">
							<div className="flex justify-between mb-2">
								<span className="text-gray-600">Servicio:</span>
								<span className="font-medium">{servicio.nombre}</span>
							</div>
							<div className="flex justify-between mb-2">
								<span className="text-gray-600">Monto:</span>
								<span className="font-medium">
									{servicio.precio.toLocaleString('es-ES', {
										style: 'currency',
										currency: 'EUR',
									})}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Método de pago:</span>
								<span className="font-medium">
									{
										metodosPago.find((m) => m.id === metodoPagoSeleccionado)
											?.nombre
									}
								</span>
							</div>
						</div>

						<p className="text-sm text-gray-500 mb-6">
							Hemos enviado un comprobante de pago a tu correo electrónico:{' '}
							<strong>{formData.email}</strong>
						</p>

						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link
								href="/"
								className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-azul-primario hover:bg-azul-primario/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-primario">
								Volver al inicio
							</Link>
							<Link
								href="/mis-servicios"
								className="inline-flex items-center justify-center px-4 py-2 border border-azul-primario text-sm font-medium rounded-md text-azul-primario bg-white hover:bg-azul-claro/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-primario">
								Ver mis servicios
							</Link>
						</div>
					</motion.div>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-4xl mx-auto">
				<div className="text-center mb-8">
					<Link
						href="/"
						className="inline-block">
						<Image
							src={logo}
							alt="VirtuAbogado Logo"
							width={180}
							height={60}
							className="mx-auto"
						/>
					</Link>
					<h1 className="mt-6 text-3xl font-extrabold text-azul-primario">
						Completar pago
					</h1>
					<p className="mt-2 text-sm text-gray-600">
						Estás a un paso de adquirir tu servicio legal
					</p>
				</div>

				<div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
					<div className="px-4 py-5 sm:px-6 border-b border-gray-200">
						<h2 className="text-lg font-medium text-gray-900">
							Resumen del servicio
						</h2>
					</div>
					<div className="px-4 py-5 sm:p-6">
						<div className="flex flex-col md:flex-row md:items-center md:justify-between">
							<div className="mb-4 md:mb-0">
								<h3 className="text-lg font-medium text-gray-900">
									{servicio.nombre}
								</h3>
								<p className="mt-1 text-sm text-gray-600">
									{servicio.descripcion}
								</p>
							</div>
							<div className="text-2xl font-bold text-azul-primario">
								{servicio.precio.toLocaleString('es-ES', {
									style: 'currency',
									currency: 'EUR',
								})}
							</div>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
					<div className="md:col-span-2">
						<div className="bg-white shadow sm:rounded-lg overflow-hidden">
							<div className="px-4 py-5 sm:px-6 border-b border-gray-200">
								<h2 className="text-lg font-medium text-gray-900">
									Método de pago
								</h2>
							</div>

							<div className="px-4 py-5 sm:p-6">
								<div className="space-y-4 mb-6">
									{metodosPago.map((metodo) => (
										<div
											key={metodo.id}
											className={`border rounded-lg p-4 cursor-pointer transition-colors ${
												metodoPagoSeleccionado === metodo.id
													? 'border-azul-primario bg-azul-claro/10'
													: 'border-gray-200 hover:border-gray-300'
											}`}
											onClick={() => handleMetodoPagoChange(metodo.id)}>
											<div className="flex items-center">
												<div
													className={`flex-shrink-0 h-6 w-6 rounded-full border ${
														metodoPagoSeleccionado === metodo.id
															? 'border-azul-primario'
															: 'border-gray-300'
													} flex items-center justify-center`}>
													{metodoPagoSeleccionado === metodo.id && (
														<div className="h-3 w-3 rounded-full bg-azul-primario" />
													)}
												</div>
												<div className="ml-3 flex items-center">
													<span className="mr-3">{metodo.icono}</span>
													<div>
														<p className="text-sm font-medium text-gray-900">
															{metodo.nombre}
														</p>
														<p className="text-xs text-gray-500">
															{metodo.descripcion}
														</p>
													</div>
												</div>
											</div>
										</div>
									))}
								</div>

								{metodoPagoSeleccionado && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: 'auto' }}
										transition={{ duration: 0.3 }}>
										<form
											onSubmit={handleSubmit}
											className="space-y-6">
											{metodoPagoSeleccionado === 'tarjeta' && (
												<>
													<div>
														<label
															htmlFor="nombreTitular"
															className="block text-sm font-medium text-gray-700">
															Nombre del titular
														</label>
														<div className="mt-1">
															<input
																type="text"
																id="nombreTitular"
																name="nombreTitular"
																value={formData.nombreTitular}
																onChange={handleInputChange}
																className={`block w-full px-3 py-2 border ${
																	errors.nombreTitular
																		? 'border-red-300'
																		: 'border-gray-300'
																} rounded-md shadow-sm focus:outline-none focus:ring-azul-primario focus:border-azul-primario sm:text-sm`}
																placeholder="Nombre como aparece en la tarjeta"
															/>
															{errors.nombreTitular && (
																<p className="mt-2 text-sm text-red-600">
																	{errors.nombreTitular}
																</p>
															)}
														</div>
													</div>

													<div>
														<label
															htmlFor="numeroTarjeta"
															className="block text-sm font-medium text-gray-700">
															Número de tarjeta
														</label>
														<div className="mt-1 relative rounded-md shadow-sm">
															<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
																<FiCreditCard className="h-5 w-5 text-gray-400" />
															</div>
															<input
																type="text"
																id="numeroTarjeta"
																name="numeroTarjeta"
																value={formData.numeroTarjeta}
																onChange={handleInputChange}
																className={`block w-full pl-10 pr-3 py-2 border ${
																	errors.numeroTarjeta
																		? 'border-red-300'
																		: 'border-gray-300'
																} rounded-md shadow-sm focus:outline-none focus:ring-azul-primario focus:border-azul-primario sm:text-sm`}
																placeholder="1234 5678 9012 3456"
															/>
														</div>
														{errors.numeroTarjeta && (
															<p className="mt-2 text-sm text-red-600">
																{errors.numeroTarjeta}
															</p>
														)}
													</div>

													<div className="grid grid-cols-2 gap-4">
														<div>
															<label
																htmlFor="fechaExpiracion"
																className="block text-sm font-medium text-gray-700">
																Fecha de expiración
															</label>
															<div className="mt-1">
																<input
																	type="text"
																	id="fechaExpiracion"
																	name="fechaExpiracion"
																	value={formData.fechaExpiracion}
																	onChange={handleInputChange}
																	className={`block w-full px-3 py-2 border ${
																		errors.fechaExpiracion
																			? 'border-red-300'
																			: 'border-gray-300'
																	} rounded-md shadow-sm focus:outline-none focus:ring-azul-primario focus:border-azul-primario sm:text-sm`}
																	placeholder="MM/YY"
																/>
																{errors.fechaExpiracion && (
																	<p className="mt-2 text-sm text-red-600">
																		{errors.fechaExpiracion}
																	</p>
																)}
															</div>
														</div>

														<div>
															<label
																htmlFor="cvv"
																className="block text-sm font-medium text-gray-700">
																Código de seguridad (CVV)
															</label>
															<div className="mt-1">
																<input
																	type="text"
																	id="cvv"
																	name="cvv"
																	value={formData.cvv}
																	onChange={handleInputChange}
																	className={`block w-full px-3 py-2 border ${
																		errors.cvv
																			? 'border-red-300'
																			: 'border-gray-300'
																	} rounded-md shadow-sm focus:outline-none focus:ring-azul-primario focus:border-azul-primario sm:text-sm`}
																	placeholder="123"
																/>
																{errors.cvv && (
																	<p className="mt-2 text-sm text-red-600">
																		{errors.cvv}
																	</p>
																)}
															</div>
														</div>
													</div>
												</>
											)}

											{metodoPagoSeleccionado === 'transferencia' && (
												<div className="bg-blue-50 p-4 rounded-md">
													<h3 className="text-sm font-medium text-blue-800 mb-2">
														Datos para transferencia bancaria
													</h3>
													<ul className="text-sm text-blue-700 space-y-2">
														<li>
															<strong>Banco:</strong> Banco VirtuAbogado
														</li>
														<li>
															<strong>Titular:</strong> VirtuAbogado S.L.
														</li>
														<li>
															<strong>IBAN:</strong> ES12 3456 7890 1234 5678
															9012
														</li>
														<li>
															<strong>Concepto:</strong> Servicio #{servicio.id}{' '}
															- {formData.email}
														</li>
													</ul>
													<p className="text-xs text-blue-600 mt-3">
														<FiClock className="inline mr-1" />
														Una vez realizada la transferencia, tu servicio será
														activado en un plazo de 24-48 horas hábiles.
													</p>
												</div>
											)}

											{metodoPagoSeleccionado === 'paypal' && (
												<div className="text-center">
													<p className="text-sm text-gray-600 mb-4">
														Serás redirigido a PayPal para completar el pago de
														forma segura.
													</p>
													<Image
														src="/icons/paypal-button.png"
														alt="Pagar con PayPal"
														width={250}
														height={50}
														className="mx-auto cursor-pointer"
													/>
												</div>
											)}

											<div>
												<label
													htmlFor="email"
													className="block text-sm font-medium text-gray-700">
													Correo electrónico para recibir el comprobante
												</label>
												<div className="mt-1">
													<input
														type="email"
														id="email"
														name="email"
														value={formData.email}
														onChange={handleInputChange}
														className={`block w-full px-3 py-2 border ${
															errors.email
																? 'border-red-300'
																: 'border-gray-300'
														} rounded-md shadow-sm focus:outline-none focus:ring-azul-primario focus:border-azul-primario sm:text-sm`}
														placeholder="tu@email.com"
													/>
													{errors.email && (
														<p className="mt-2 text-sm text-red-600">
															{errors.email}
														</p>
													)}
												</div>
											</div>

											{errors.form && (
												<div className="rounded-md bg-red-50 p-4">
													<div className="flex">
														<div className="ml-3">
															<p className="text-sm text-red-700">
																{errors.form}
															</p>
														</div>
													</div>
												</div>
											)}

											<div>
												<button
													type="submit"
													disabled={isSubmitting}
													className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-azul-primario hover:bg-azul-primario/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-primario ${
														isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
													}`}>
													{isSubmitting
														? 'Procesando...'
														: `Pagar ${servicio.precio.toLocaleString('es-ES', {
																style: 'currency',
																currency: 'EUR',
														  })}`}
												</button>
											</div>
										</form>
									</motion.div>
								)}
							</div>
						</div>
					</div>

					<div className="md:col-span-1">
						<div className="bg-white shadow sm:rounded-lg overflow-hidden sticky top-8">
							<div className="px-4 py-5 sm:px-6 border-b border-gray-200">
								<h2 className="text-lg font-medium text-gray-900">
									Resumen del pedido
								</h2>
							</div>
							<div className="px-4 py-5 sm:p-6">
								<div className="flex justify-between mb-4">
									<span className="text-sm text-gray-600">
										{servicio.nombre}
									</span>
									<span className="text-sm font-medium">
										{servicio.precio.toLocaleString('es-ES', {
											style: 'currency',
											currency: 'EUR',
										})}
									</span>
								</div>
								<div className="border-t border-gray-200 pt-4 mb-4">
									<div className="flex justify-between">
										<span className="text-base font-medium text-gray-900">
											Total
										</span>
										<span className="text-base font-medium text-azul-primario">
											{servicio.precio.toLocaleString('es-ES', {
												style: 'currency',
												currency: 'EUR',
											})}
										</span>
									</div>
								</div>

								<div className="mt-6 space-y-4">
									<div className="flex items-center text-sm text-gray-500">
										<FiShield className="mr-2 text-green-500" />
										<span>Pago 100% seguro y encriptado</span>
									</div>
									<div className="flex items-center text-sm text-gray-500">
										<FiLock className="mr-2 text-green-500" />
										<span>Tus datos están protegidos</span>
									</div>
								</div>

								<div className="mt-6">
									<Link
										href="/servicios"
										className="text-sm text-azul-primario hover:text-azul-primario/80 flex items-center">
										<FiArrowLeft className="mr-1" />
										<span>Volver a servicios</span>
									</Link>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}
