'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import logo from '../../public/logo/logo_sf_1.png';
import userImage from '../../public/user.png';

interface User {
	name?: string;
	picture?: string;
	role?: string;
}

const Navbar = () => {
	const [isOpen, setIsOpen] = useState(false);
	const [user, setUser] = useState<User | null>(null);
	const router = useRouter();

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const res = await fetch('http://localhost:3001/api/auth/me', {
					method: 'GET',
					credentials: 'include',
				});

				if (!res.ok) throw new Error('Error en la respuesta');

				const data = await res.json();
				setUser(data);
			} catch (error) {
				console.error('Error al obtener el usuario:', error);
				setUser(null);
			}
		};

		fetchUser();
	}, []);

	const handleLogout = async () => {
		try {
			await fetch('http://localhost:3001/api/auth/logout', {
				method: 'POST',
				credentials: 'include',
			});

			setUser(null);
			router.push('/login');
			router.refresh();
		} catch (error) {
			console.error('Error al cerrar sesión:', error);
		}
	};

	const navItems = ['Nosotros', 'Servicios', 'Contacto', 'Clientes'];

	return (
		<motion.nav
			className="w-full fixed z-50 glass-card h-16" // Altura fija de 4rem (64px)
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				duration: 0.5,
				ease: 'easeOut',
			}}>
			<div className="container mx-auto px-6 py-2 flex justify-between items-center h-full">
				{' '}
				{/* py-2 en lugar de py-4 */} {/* Agregar max-w-screen-xl */}
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
						/>
					</motion.div>
				</Link>
				{/* Menú Desktop */}
				<div className="hidden md:flex space-x-6 items-center overflow-x-auto">
					{' '}
					{/* Agregar overflow-x-auto */}
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
					{user?.role === 'admin' && (
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
					{user ? (
						<div className="flex items-center space-x-4">
							<div className="relative w-10 h-10">
								<Image
									src={user.picture || userImage}
									alt="User"
									fill
									className="rounded-full border-2 border-azul-primario object-cover"
								/>
							</div>
							<span className="text-azul-primario font-medium hidden sm:inline">
								{user?.name || 'Usuario'}
							</span>
							<button
								onClick={handleLogout}
								className="btn-primary hover:bg-vinotinto-light px-4 py-1.5 text-sm sm:text-base"
								aria-label="Cerrar sesión">
								Cerrar sesión
							</button>

							<button
								onClick={() => setIsOpen(!isOpen)}
								className="text-azul-primario p-2 rounded-lg hover:bg-gray-800/10 transition-all duration-300"
								aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}>
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
					) : (
						<>
							<Link href="/login">
								<button className="btn-primary px-5 py-2">
									Iniciar sesión
								</button>
							</Link>
							{/*<Link href="/register">
								<button className="ml-2 px-5 py-2 bg-azul-primario hover:bg-azul-primario/90 text-white rounded-xl shadow-lg transition-all duration-300">
									Registrarse
								</button>
							</Link>*/}
						</>
					)}
				</div>
				<div className="md:hidden">
					<button
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

						{user?.role === 'admin' && (
							<motion.div whileHover={{ scale: 1.05 }}>
								<Link
									href="/dashboard"
									className="block text-azul-primario text-lg font-medium"
									onClick={() => setIsOpen(false)}>
									Dashboard
								</Link>
							</motion.div>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</motion.nav>
	);
};

export default Navbar;
