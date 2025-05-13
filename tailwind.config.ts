import type { Config } from 'tailwindcss';

const config: Config = {
	content: ['./src/**/*.{js,ts,jsx,tsx}'],
	theme: {
		extend: {
			colors: {
				vinotinto: '#8E2427',
				'vinotinto-light': '#a83137',
				'azul-primario': '#1961A0',
				'azul-claro': '#E8F4FD',
				'glass-white': 'rgba(255, 255, 255, 0.15)',
			},
		},
	},
	plugins: [],
};

export default config;
