/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta "Luz Urbana" — streetwear premium, tono claro cálido
        ink:      '#F8F6F3',   // fondo principal (warm off-white)
        graphite: '#EDEBE6',   // fondo secundario / áreas
        surface:  '#F3F0EB',   // superficie media
        coal:     '#E5E2DC',   // relleno para placeholders e imagen
        bone:     '#1C1A17',   // texto principal (near-black)
        stone:    '#5C5850',   // texto secundario
        muted:    '#9C9890',   // texto terciario / muted
        ember:    '#E0561E',   // acento naranja — marca URBAN SEVEN
        'ember-muted': '#E0561E30',
        success:  '#2A7048',
        'success-dim': '#2A704820',
        danger:   '#C2452F',
        'danger-dim':  '#C2452F20',
        warn:     '#B07828',
        'warn-dim':    '#B0782820'
      },
      fontFamily: {
        display: ['Archivo', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      letterSpacing: {
        tightest: '-0.04em',
        display:  '-0.02em'
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.5rem'
      },
      boxShadow: {
        card:         '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.05)',
        'card-hover': '0 6px 18px -4px rgba(0,0,0,0.12), 0 2px 6px -2px rgba(0,0,0,0.06)',
        ember:        '0 8px 32px -8px rgba(224,86,30,0.50)',
        'ember-sm':   '0 4px 16px -4px rgba(224,86,30,0.40)',
        glow:         '0 0 0 3px rgba(224,86,30,0.18)',
        'inner-top':  'inset 0 1px 0 rgba(255,255,255,0.8)'
      },
      keyframes: {
        'slide-up': {
          '0%':   { transform: 'translateY(14px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' }
        },
        'slide-down': {
          '0%':   { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',      opacity: '1' }
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'scan-line': {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        'pop': {
          '0%':   { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' }
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(42,112,72,0.35)' },
          '50%':      { opacity: '0.85', boxShadow: '0 0 0 4px rgba(42,112,72,0)' }
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        'slide-up':   'slide-up .26s cubic-bezier(.16,1,.3,1)',
        'slide-down': 'slide-down .22s cubic-bezier(.16,1,.3,1)',
        'fade-in':    'fade-in .2s ease-out',
        'scan-line':  'scan-line 2s ease-in-out infinite alternate',
        'pop':        'pop .17s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer':    'shimmer 1.6s linear infinite'
      }
    }
  },
  plugins: []
}
