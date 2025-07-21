/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class', // 启用class策略的暗色模式
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './lib/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // 基于CSS变量的颜色系统
                background: 'rgb(var(--color-background))',
                'background-secondary': 'rgb(var(--color-background-secondary))',
                surface: 'rgb(var(--color-surface))',
                'surface-hover': 'rgb(var(--color-surface-hover))',
                border: 'rgb(var(--color-border))',
                'border-light': 'rgb(var(--color-border-light))',
                'text-primary': 'rgb(var(--color-text-primary))',
                'text-secondary': 'rgb(var(--color-text-secondary))',
                'text-muted': 'rgb(var(--color-text-muted))',
                'text-inverse': 'rgb(var(--color-text-inverse))',
                'card-background': 'rgb(var(--color-card-background))',
                'card-border': 'rgb(var(--color-card-border))',
                'hover-background': 'rgb(var(--color-hover-background))',
                'active-background': 'rgb(var(--color-active-background))',
                'focus-ring': 'rgb(var(--color-focus-ring))',
            },
            backgroundImage: {
                'gradient-main': 'var(--gradient-background)',
                'gradient-card': 'var(--gradient-card)',
            },
            boxShadow: {
                'theme-sm': 'var(--shadow-sm)',
                'theme-md': 'var(--shadow-md)',
                'theme-lg': 'var(--shadow-lg)',
                'theme-xl': 'var(--shadow-xl)',
            },
            fontFamily: {
                sans: ['var(--font-inter)'],
                mono: ['var(--font-jetbrains-mono)'],
            },
            animation: {
                'pulse-border': 'pulse-border 2s ease-in-out infinite',
                'fade-in-up': 'fade-in-up 0.6s ease-out',
                'scale-in': 'scale-in 0.4s ease-out',
            },
        },
    },
    plugins: [],
}; 