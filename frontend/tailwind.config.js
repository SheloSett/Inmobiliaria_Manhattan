/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Legacy colors comentados - reemplazados por Manhattan Prestige Design System
        // primary: {
        //   DEFAULT: '#1a1a2e',
        //   light: '#16213e',
        //   dark: '#0f0e17',
        // },

        // gold mantenido para compatibilidad con AdminLayout (usa bg-gold, text-gold)
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e2c16e',
          dark: '#a07830',
        },

        // Manhattan Prestige Design System - 51 tokens de color
        'surface-container-low': '#f2f4f6',
        'on-tertiary-fixed-variant': '#38485d',
        'on-tertiary-fixed': '#0b1c30',
        'on-secondary': '#ffffff',
        'on-background': '#191c1e',
        'tertiary-container': '#1b2b3f',
        'inverse-surface': '#2d3133',
        'surface-variant': '#e0e3e5',
        'on-error-container': '#93000a',
        'on-secondary-fixed': '#410002',
        'on-primary-fixed-variant': '#26496a',
        'primary-fixed': '#cfe5ff',
        'tertiary-fixed': '#d3e4fe',
        'on-primary-fixed': '#001d34',
        surface: '#f7f9fb',
        'on-primary': '#ffffff',
        'primary-container': '#002c4b',
        'primary-fixed-dim': '#a8caf0',
        'surface-bright': '#f7f9fb',
        'on-tertiary': '#ffffff',
        'inverse-primary': '#a8caf0',
        'surface-container-highest': '#e0e3e5',
        'surface-tint': '#3f6183',
        'on-primary-container': '#7394b8',
        'surface-dim': '#d8dadc',
        'inverse-on-surface': '#eff1f3',
        error: '#ba1a1a',
        background: '#f7f9fb',
        'error-container': '#ffdad6',
        'on-secondary-container': '#fffbff',
        'surface-container': '#eceef0',
        'surface-container-lowest': '#ffffff',
        'outline-variant': '#c3c7ce',
        'surface-container-high': '#e6e8ea',
        tertiary: '#051629',
        'secondary-container': '#e32122',
        'on-surface': '#191c1e',
        'on-surface-variant': '#42474e',
        'on-error': '#ffffff',
        'on-tertiary-container': '#8292ab',
        primary: '#00172b',
        'secondary-fixed-dim': '#ffb4ab',
        outline: '#73777e',
        'secondary-fixed': '#ffdad5',
        'tertiary-fixed-dim': '#b7c8e1',
        secondary: '#bb000f',
        'on-secondary-fixed-variant': '#930009',
      },
      borderRadius: {
        sm: '0.125rem',     // 2px
        DEFAULT: '0.25rem', // 4px - estándar para botones e inputs
        md: '0.375rem',     // 6px
        lg: '0.5rem',       // 8px - cards de propiedades
        xl: '0.75rem',      // 12px - contenedores grandes
        full: '9999px',     // círculos (avatares)
      },
      spacing: {
        'margin-desktop': '64px',
        gutter: '24px',
        unit: '4px',
        'margin-mobile': '20px',
        'stack-sm': '12px',
        'stack-lg': '48px',
        'container-max': '1280px',
        'stack-md': '24px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        // serif: ['Playfair Display', 'serif'], // comentado - reemplazado por Manrope
        'label-md': ['Inter'],
        // Tokens agregados para el formulario de propiedad del admin (template
        // admin_create_Properties): títulos de sección y labels chicos.
        'headline-sm': ['Manrope'],
        'label-sm': ['Inter'],
        'price-display': ['Manrope'],
        'body-lg': ['Inter'],
        'body-md': ['Inter'],
        'headline-lg-mobile': ['Manrope'],
        'headline-md': ['Manrope'],
        'headline-xl': ['Manrope'],
        'headline-lg': ['Manrope'],
      },
      fontSize: {
        'label-md': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        // Tokens agregados para el formulario de propiedad del admin (ver fontFamily)
        'headline-sm': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'price-display': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'headline-lg-mobile': ['28px', { lineHeight: '36px', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'headline-xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['32px', { lineHeight: '40px', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
}
