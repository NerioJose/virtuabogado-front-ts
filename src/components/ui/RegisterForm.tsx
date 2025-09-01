'use client';

import { useState } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Reutilizamos los componentes del LoginForm
interface AuthLayoutProps {
	children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-gray-100 px-4 py-12">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="glass-card p-8 md:p-10 w-full max-w-md">
				{children}
			</motion.div>
		</div>
	);
};

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'className'> {
	children: React.ReactNode;
	className?: string;
}

export const Button: React.FC<ButtonProps> = ({
	children,
	className = '',
	...props
}) => {
	return (
		<motion.button
			whileHover={{ scale: 1.02 }}
			whileTap={{ scale: 0.98 }}
			className={`btn-primary ${className}`}
			{...props}>
			{children}
		</motion.button>
	);
};

interface FieldProps {
	children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ children }) => {
	return <div className="space-y-2">{children}</div>;
};

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
	children: React.ReactNode;
}

export const Label: React.FC<LabelProps> = ({ children, ...props }) => {
	return (
		<label
			className="block text-sm font-medium text-gray-700"
			{...props}>
			{children}
		</label>
	);
};

interface HeadingProps {
	children: React.ReactNode;
}

export const Heading: React.FC<HeadingProps> = ({ children }) => {
	return <h2 className="text-2xl font-bold text-azul-primario">{children}</h2>;
};

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input: React.FC<InputProps> = (props) => {
	return (
		<input
			className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-azul-primario focus:outline-none focus:ring-1 focus:ring-azul-primario"
			{...props}
		/>
	);
};

interface TextProps {
	children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({ children }) => {
	return <p className="text-sm text-gray-600">{children}</p>;
};

interface TextLinkProps {
	href: string;
	children: React.ReactNode;
}

export const TextLink: React.FC<TextLinkProps> = ({ href, children }) => {
	return (
		<Link
			href={href}
			className="text-azul-primario hover:text-vinotinto transition-colors">
			{children}
		</Link>
	);
};

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
	return (
		<div className={`flex items-center gap-2 ${className}`}>
			<div className="w-8 h-8 bg-vinotinto rounded-lg flex items-center justify-center">
				<svg
					className="w-5 h-5 text-white"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
					/>
				</svg>
			</div>
			<span className="text-xl font-bold text-azul-primario">VirtuAbogado</span>
		</div>
	);
};

const RegisterForm: React.FC = () => {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [tipoUsuario, setTipoUsuario] = useState('cliente'); // cliente o abogado
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		// Validación básica
		if (password !== confirmPassword) {
			setError('Las contraseñas no coinciden');
			setLoading(false);
			return;
		}

		try {
			// Simulamos registro exitoso para desarrollo
			const userData = {
				name,
				email,
				rol: tipoUsuario,
				picture: '/user.png',
			};

			// Simulamos una cookie o token de sesión
			localStorage.setItem('user', JSON.stringify(userData));

			// Redirigimos a la página correspondiente según el tipo de usuario
			router.push(tipoUsuario === 'cliente' ? '/' : '/abogado');
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al registrarse');
		} finally {
			setLoading(false);
		}
	};

	return (
		<AuthLayout>
			<form
				onSubmit={handleSubmit}
				className="grid w-full max-w-sm grid-cols-1 gap-6">
				<Logo className="h-6 text-zinc-950 dark:text-white" />
				<Heading>Crear cuenta</Heading>

				{error && (
					<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
						{error}
					</div>
				)}

				<Field>
					<Label>Nombre completo</Label>
					<Input
						type="text"
						name="name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>
				</Field>

				<Field>
					<Label>Correo electrónico</Label>
					<Input
						type="email"
						name="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
				</Field>

				<Field>
					<Label>Contraseña</Label>
					<Input
						type="password"
						name="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</Field>

				<Field>
					<Label>Confirmar contraseña</Label>
					<Input
						type="password"
						name="confirmPassword"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						required
					/>
				</Field>

				{/* Selector de tipo de usuario */}
				<Field>
					<Label>Tipo de cuenta</Label>
					<div className="flex space-x-4 mt-2">
						<label className="flex items-center">
							<input
								type="radio"
								name="tipoUsuario"
								value="cliente"
								checked={tipoUsuario === 'cliente'}
								onChange={() => setTipoUsuario('cliente')}
								className="mr-2"
							/>
							Cliente
						</label>
						<label className="flex items-center">
							<input
								type="radio"
								name="tipoUsuario"
								value="abogado"
								checked={tipoUsuario === 'abogado'}
								onChange={() => setTipoUsuario('abogado')}
								className="mr-2"
							/>
							Abogado
						</label>
					</div>
				</Field>

				<Button
					type="submit"
					className="w-full"
					disabled={loading}>
					{loading ? 'Registrando...' : 'Registrarse'}
				</Button>

				<Text>
					¿Ya tienes una cuenta?{' '}
					<TextLink href="/login">Iniciar sesión</TextLink>
				</Text>
			</form>
		</AuthLayout>
	);
};

export default RegisterForm;
