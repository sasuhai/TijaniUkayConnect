/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'brand-dark': '#1a2e23',
                'brand-green': '#166534',
                'brand-light-green': '#22c55e',
                'brand-gold': '#f59e0b',
                'brand-light-gray': '#f3f4f6',
            },
            keyframes: {
                'fade-in-down': {
                    '0%': { opacity: '0', transform: 'translateY(-20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'fade-in-up': {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            },
            animation: {
                'fade-in-down': 'fade-in-down 0.6s ease-out forwards',
                'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
            },
            boxShadow: {
                'glow-green': '0 0 15px 5px rgba(34, 197, 94, 0.4)',
            }
        }
    },
    plugins: [],
}
