'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import logo from '/public/logo/logo_sf_1.png';
import userImage from '/public/user.png';
import { useAuthStore } from '@/features/auth/store/authStore';

const Navbar = () => {
	const [isOpen, setIsOpen] = useState(false);
	const router = useRouter();

	// Usar authStore para estado de autenticación
	const { user, logout } = useAuthStore();



	const handleLogout = () => {
		try {
			setIsOpen(false);
			logout();
			router.push('/login');
		} catch (error) {
			console.error('Error al cerrar sesión:', error);
		}
	};

	const navItems = ['Nosotros', 'Servicios', 'Contacto', 'Clientes'];

	return (
		<motion.nav
			className="w-full fixed z-50 glass-card h-16"
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				duration: 0.5,
				ease: 'easeOut',
			}}>
			<div className="container mx-auto px-6 py-2 flex justify-between items-center h-full">
				<Link href="/">
					<motion.div
						className="relative flex items-center"
						whileHover={{ scale: 1.05 }}
						transition={{ type: 'spring', stiffness: 300 }}>
						<Image
							src={logo}
							alt="Logo"
							width={150}
							height={70}
							className="relative z-10"
							priority
						/>
					</motion.div>
				</Link>

				{/* Menú Desktop */}
				<div className="hidden md:flex space-x-6 items-center">
					{navItems.map((item) => (
						<motion.div
							key={item}
							className="relative group"
							whileHover={{ scale: 1.05 }}
							transition={{ duration: 0.3 }}>
							<Link
								href={`/${item.toLowerCase().replace(/\s+/g, '-')}`}
								className="text-azul-primario hover:text-vinotinto text-lg font-medium relative z-10 transition-colors duration-200">
								{item}
							</Link>
							<motion.span
								className="absolute bottom-0 left-0 w-full h-0.5 bg-vinotinto"
								initial={{ width: 0 }}
								animate={{ width: '100%' }}
								transition={{ duration: 0.5 }}
							/>
						</motion.div>
					))}

					{user?.rol === 'admin' && (
						<motion.div className="relative group">
							<Link
								href="/dashboard"
								className="text-azul-primario hover:text-vinotinto text-lg font-medium relative z-10 transition-colors duration-200">
								Dashboard
							</Link>
							<motion.span
								className="absolute bottom-0 left-0 w-full h-0.5 bg-vinotinto"
								initial={{ width: 0 }}
								animate={{ width: '100%' }}
								transition={{ duration: 0.5 }}
							/>
						</motion.div>
					)}

					{/* Renderizado condicional mejorado */}
					{user ? (
						<div className="flex items-center space-x-4">
							<div className="relative w-10 h-10">
								<Image
									src={user.picture || userImage}
									alt="User"
									fill
									className="rounded-full border-2 border-azul-primario object-cover"
									loading="lazy"
								/>
							</div>
							<span className="text-azul-primario font-medium hidden sm:inline">
								{user?.nombre || 'Usuario'}
							</span>
							<button
								onClick={handleLogout}
								className="btn-primary hover:bg-vinotinto-light px-4 py-1.5 text-sm sm:text-base"
								aria-label="Cerrar sesión">
								Cerrar sesión
							</button>
						</div>
					) : (
						<Link href="/login">
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className="btn-primary">
								Iniciar Sesión
							</motion.button>
						</Link>
					)}
				</div>

				{/* Botón menú móvil */}
				<div className="md:hidden">
					<button
						title="Toggle navigation menu"
						onClick={() => setIsOpen(!isOpen)}
						className="text-azul-primario p-2 rounded-lg hover:bg-gray-800/10 transition-all duration-300">
						<svg
							className="w-6 h-6"
							fill="none"
							viewBox="0 0 24 24">
							{isOpen ? (
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
									className="stroke-azul-primario"
								/>
							) : (
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 6h16M4 12h16M4 18h16"
									className="stroke-azul-primario"
								/>
							)}
						</svg>
					</button>
				</div>
			</div>

			{/* Menú móvil */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ y: -20, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: -20, opacity: 0 }}
						className="md:hidden mt-4 space-y-4 glass-card p-6 shadow-xl">
						{navItems.map((item) => (
							<motion.div
								key={item}
								whileHover={{ scale: 1.05 }}>
								<Link
									href={`/${item.toLowerCase().replace(/\s+/g, '-')}`}
									className="block text-azul-primario text-lg font-medium"
									onClick={() => setIsOpen(false)}>
									{item}
								</Link>
							</motion.div>
						))}

						{user?.rol === 'admin' && (
							<motion.div whileHover={{ scale: 1.05 }}>
								<Link
									href="/dashboard"
									className="block text-azul-primario text-lg font-medium"
									onClick={() => setIsOpen(false)}>
									Dashboard
								</Link>
							</motion.div>
						)}

						{/* Opciones de auth en menú móvil */}
						{user ? (
							<div className="border-t pt-4 space-y-3">
								<div className="flex items-center space-x-3">
									<div className="relative w-8 h-8">
										<Image
											src={user.picture || userImage}
											alt="User"
											fill
											className="rounded-full border-2 border-azul-primario object-cover"
										/>
									</div>
									<span className="text-azul-primario font-medium">
										{user?.nombre || 'Usuario'}
									</span>
								</div>
								<button
									onClick={handleLogout}
									className="w-full btn-primary hover:bg-vinotinto-light px-4 py-2 text-left">
									Cerrar sesión
								</button>
							</div>
						) : (
							<div className="border-t pt-4 space-y-3">
								<Link href="/login">
									<button
										className="w-full btn-primary px-5 py-2"
										onClick={() => setIsOpen(false)}>
										Iniciar sesión
									</button>
								</Link>
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</motion.nav>
	);
};

export default Navbar;
