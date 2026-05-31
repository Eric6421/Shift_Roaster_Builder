/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Scope utilities to #root so Tailwind does not override global Ant Design styles
  important: '#root',
  corePlugins: {
    // Ant Design ships its own base/normalize via CSS-in-JS; disable Tailwind preflight
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
}
