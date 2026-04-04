'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FiChevronDown, FiFileText, FiLogOut, FiUser, FiSettings } from 'react-icons/fi';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useOrdersStore } from '@/features/orders';
import { User, UserRole } from '@/shared/types/entities.types';

// Las imágenes en /public se referencian directamente por su path desde la raíz / en el src del Image component.

const getDisplayName = (user: any) => {
	if (!user) return 'Usuario';
	
	// Intenta obtener el nombre desde diferentes posibles campos de Supabase o Prisma
	let rawName = user.nombre || user.user_metadata?.full_name || user.user_metadata?.name || user.name;
	
	// Si el nombre no existe, es genérico o es un email, usamos la primera parte del email
	if (!rawName || rawName === 'Usuario Nuevo' || rawName === 'Usuario' || rawName.includes('@')) {
		if (user.email) {
			rawName = user.email.split('@')[0];
		} else {
			return 'Usuario';
		}
	}

	// Limpiar caracteres extraños (ej. números en un email como neriojose531) para un look más limpio,
	// pero como un nombre válido puede tener números, solo lo formatearemos estéticamente.
	const cleanName = rawName.trim();
	
	// Capitalizar la primera letra
	return cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
};

// Componente del menú desplegable de usuario
interface UserMenuProps {
	user: User;
	onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout }) => {
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const orders = useOrdersStore((state) => state.orders);

	// Contar servicios activos del usuario (PAGADOS)
	const userActiveServices = orders.filter(
		order =>
			order.userId === user.id &&
			(order.status === 'COMPLETADO' || order.status === 'EN_PROGRESO')
	).length;

	return (
		<div className="relative">
			{/* Botón del usuario */}
			<button
				onClick={() => setIsDropdownOpen(!isDropdownOpen)}
				className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
			>
				<div className="relative w-10 h-10">
					<Image
						src={user.picture || "/user.png"}
						alt="User"
						fill
						className="rounded-full border-2 border-azul-primario object-cover"
						loading="lazy"
					/>
				</div>
				<span className="text-azul-primario font-medium hidden sm:inline">
					{getDisplayName(user)}
				</span>
				<FiChevronDown
					className={`text-azul-primario transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
				/>
			</button>

			{/* Dropdown */}
			<AnimatePresence>
				{isDropdownOpen && (
					<>
						{/* Overlay para cerrar al hacer click fuera */}
						<div
							className="fixed inset-0 z-40"
							onClick={() => setIsDropdownOpen(false)}
						/>

						<motion.div
							initial={{ opacity: 0, y: -10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{ duration: 0.2 }}
							className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
						>
							{/* Info del usuario */}
							<div className="px-4 py-3 border-b border-gray-100">
								<p className="text-sm font-semibold text-gray-900">
									{getDisplayName(user)}
								</p>
								<p className="text-xs text-gray-500 mt-1">
									{user.email}
								</p>
							</div>

							{/* Enlaces del menú */}
							<div className="py-2">
								{/* Mis Servicios - Visible solo para clientes */}
								{user.rol === UserRole.CLIENTE && (
									<Link href="/mis-servicios">
										<button
											onClick={() => setIsDropdownOpen(false)}
											className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between group transition-colors"
										>
											<div className="flex items-center space-x-3">
												<FiFileText className="text-azul-primario" />
												<span className="text-gray-700 group-hover:text-azul-primario">
													Mis Servicios
												</span>
											</div>
											{userActiveServices > 0 && (
												<span className="bg-azul-primario text-white text-xs font-semibold px-2 py-0.5 rounded-full">
													{userActiveServices}
												</span>
											)}
										</button>
									</Link>
								)}

								{/* Abogado Panel (solo abogado) */}
								{user.rol === UserRole.ABOGADO && (
									<Link href="/abogado">
										<button
											onClick={() => setIsDropdownOpen(false)}
											className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 group transition-colors"
										>
											<FiSettings className="text-azul-primario" />
											<span className="text-gray-700 group-hover:text-azul-primario">
												Panel de Abogado
											</span>
										</button>
									</Link>
								)}

								{/* Admin Dashboard (solo admin) */}
								{user.rol === UserRole.ADMIN && (
									<Link href="/admin">
										<button
											onClick={() => setIsDropdownOpen(false)}
											className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-3 group transition-colors"
										>
											<FiSettings className="text-azul-primario" />
											<span className="text-gray-700 group-hover:text-azul-primario">
												Admin Dashboard
											</span>
										</button>
									</Link>
								)}
							</div>

							{/* Cerrar sesión */}
							<div className="border-t border-gray-100 pt-2">
								<button
									onClick={() => {
										setIsDropdownOpen(false);
										onLogout();
									}}
									className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center space-x-3 group transition-colors"
								>
									<FiLogOut className="text-red-600" />
									<span className="text-red-600 font-medium">
										Cerrar Sesión
									</span>
								</button>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
};


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
			className="w-full fixed top-0 left-1/2 -translate-x-1/2 z-50 glass-card h-16 bg-white/80 max-w-[2000px]">
			<div className="container mx-auto px-6 py-2 flex justify-between items-center h-full">
				<Link href="/">
					<motion.div
						className="relative flex items-center"
						whileHover={{ scale: 1.05 }}
						transition={{ type: 'spring', stiffness: 300 }}>
						<Image
							src="/logo/logo_sf_1.png"
							alt="Logo"
							width={150}
							height={70}
							className="relative z-10"
							style={{ height: 'auto' }}
							priority
						/>
					</motion.div>
				</Link>

				{/* Menú Desktop */}
				<div className="hidden md:flex space-x-6 items-center">
					{/* Links de Navegación */}
					<motion.div className="relative group" whileHover={{ scale: 1.05 }}>
						<Link href="/nosotros" className="text-azul-primario hover:text-vinotinto text-lg font-medium relative z-10 transition-colors">Nosotros</Link>
						<motion.span className="absolute bottom-0 left-0 w-full h-0.5 bg-vinotinto" initial={{ width: 0 }} whileHover={{ width: '100%' }} />
					</motion.div>

					<motion.div className="relative group" whileHover={{ scale: 1.05 }}>
						<Link href="/servicios" className="text-azul-primario hover:text-vinotinto text-lg font-medium relative z-10 transition-colors">Servicios</Link>
						<motion.span className="absolute bottom-0 left-0 w-full h-0.5 bg-vinotinto" initial={{ width: 0 }} whileHover={{ width: '100%' }} />
					</motion.div>

					<motion.div className="relative group" whileHover={{ scale: 1.05 }}>
						<Link href="/contacto" className="text-azul-primario hover:text-vinotinto text-lg font-medium relative z-10 transition-colors">Contacto</Link>
						<motion.span className="absolute bottom-0 left-0 w-full h-0.5 bg-vinotinto" initial={{ width: 0 }} whileHover={{ width: '100%' }} />
					</motion.div>

					<motion.div className="relative group" whileHover={{ scale: 1.05 }}>
						<Link href="/clientes" className="text-azul-primario hover:text-vinotinto text-lg font-medium relative z-10 transition-colors">Clientes</Link>
						<motion.span className="absolute bottom-0 left-0 w-full h-0.5 bg-vinotinto" initial={{ width: 0 }} whileHover={{ width: '100%' }} />
					</motion.div>

					{user?.rol === UserRole.ADMIN && (
						<motion.div 
							className="relative group px-1" 
							whileHover={{ scale: 1.05 }}
						>
							<Link
								href="/admin"
								className="text-azul-primario hover:text-vinotinto text-lg font-medium relative z-10 transition-all duration-300">
								Dashboard
							</Link>
							<motion.span
								className="absolute bottom-0 left-0 w-full h-0.5 bg-vinotinto origin-left"
								initial={{ scaleX: 0 }}
								whileHover={{ scaleX: 1 }}
								transition={{ duration: 0.3 }}
							/>
						</motion.div>
					)}

					{user?.rol === UserRole.ABOGADO && (
						<motion.div className="relative group">
							<Link
								href="/abogado"
								className="text-azul-primario hover:text-vinotinto text-lg font-medium relative z-10 transition-colors duration-200">
								Mi Panel
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
						<UserMenu user={user} onLogout={handleLogout} />
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
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						className="md:hidden fixed top-16 left-0 right-0 bg-white shadow-2xl overflow-hidden border-t border-gray-100 z-40">
						<div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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

						{user?.rol === UserRole.ADMIN && (
							<motion.div whileHover={{ scale: 1.05 }}>
								<Link
									href="/admin"
									className="block text-azul-primario text-lg font-medium"
									onClick={() => setIsOpen(false)}>
									Dashboard
								</Link>
							</motion.div>
						)}

						{user?.rol === UserRole.ABOGADO && (
							<motion.div whileHover={{ scale: 1.05 }}>
								<Link
									href="/abogado"
									className="block text-azul-primario text-lg font-medium"
									onClick={() => setIsOpen(false)}>
									Mi Panel
								</Link>
							</motion.div>
						)}

						{/* Opciones de auth en menú móvil */}
						{user ? (
							<div className="border-t pt-4 space-y-3">
								<div className="flex items-center space-x-3">
									<div className="relative w-8 h-8">
										<Image
											src={user.picture || "/user.png"}
											alt="User"
											fill
											className="rounded-full border-2 border-azul-primario object-cover"
										/>
									</div>
									<span className="text-azul-primario font-medium">
										{getDisplayName(user)}
									</span>
								</div>
								{user.rol === UserRole.CLIENTE && (
									<Link href="/mis-servicios">
										<button
											onClick={() => setIsOpen(false)}
											className="w-full btn-secondary px-4 py-2 text-left flex items-center justify-between">
											<span>Mis Servicios</span>
										</button>
									</Link>
								)}

								{user.rol === UserRole.ABOGADO && (
									<Link href="/abogado">
										<button
											onClick={() => setIsOpen(false)}
											className="w-full btn-secondary px-4 py-2 text-left">
											Panel de Abogado
										</button>
									</Link>
								)}

								{user.rol === UserRole.ADMIN && (
									<Link href="/admin">
										<button
											onClick={() => setIsOpen(false)}
											className="w-full btn-secondary px-4 py-2 text-left">
											Admin Dashboard
										</button>
									</Link>
								)}
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
					</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.nav>
	);
};

export default Navbar;
