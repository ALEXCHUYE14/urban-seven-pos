/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta "Dorsal 07" — streetwear premium, negro cálido
        ink:      '#141312',
        graphite: '#26241F',
        surface:  '#211F1B',
        coal:     '#1C1B18',
        bone:     '#F4F1EA',
        stone:    '#A8A296',
        muted:    '#6B6760',
        ember:    '#E0561E',
        'ember-muted': '#B8451640',
        success:  '#3F7D5C',
        'success-dim': '#2A5C3F20',
        danger:   '#C2452F',
        'danger-dim':  '#C2452F20',
        warn:     '#C98A2B',
        'warn-dim':    '#C98A2B20'
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
        xl2:  '1.25rem',
        xl3:  '1.5rem'
      },
      boxShadow: {
        card:    '0 1px 0 0 rgba(255,255,255,0.05) inset, 0 16px 48px -16px rgba(0,0,0,0.7)',
        'card-hover': '0 1px 0 0 rgba(255,255,255,0.07) inset, 0 20px 60px -16px rgba(0,0,0,0.8)',
        ember:   '0 8px 32px -8px rgba(224,86,30,0.55)',
        'ember-sm': '0 4px 16px -4px rgba(224,86,30,0.4)',
        glow:    '0 0 0 3px rgba(224,86,30,0.18)',
        'inner-top': '0 1px 0 0 rgba(255,255,255,0.06) inset'
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
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(63,125,92,0.4)' },
          '50%':      { opacity: '0.85', boxShadow: '0 0 0 4px rgba(63,125,92,0)' }
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        'slide-up':    'slide-up .26s cubic-bezier(.16,1,.3,1)',
        'slide-down':  'slide-down .22s cubic-bezier(.16,1,.3,1)',
        'fade-in':     'fade-in .2s ease-out',
        'scan-line':   'scan-line 2s ease-in-out infinite alternate',
        'pop':         'pop .17s ease-out',
        'pulse-glow':  'pulse-glow 2s ease-in-out infinite',
        'shimmer':     'shimmer 1.6s linear infinite'
      }
    }
  },
  plugins: []
}
