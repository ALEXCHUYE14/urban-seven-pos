# URBAN SEVEN · CRM + POS

Sistema de punto de venta y gestión de inventario para **URBAN SEVEN**
(Urb. San José, jirón H, 176 — Piura). PWA mobile-first construida con
**React 18 + TypeScript + Vite + Tailwind CSS + Supabase**.

Diseño de autor **"Dorsal 07"**: negro cálido, hueso y acento _ember_
(naranja quemado), tipografía deportiva con el numeral **07** como firma.

---

## ✨ Funcionalidades

- **Login** seguro con Supabase Auth, logo de marca y enlace de soporte a WhatsApp.
- **Inventario inteligente** con escáner QR de cámara (html5-qrcode):
  - Si el QR existe → abre la ficha para editar / ajustar stock.
  - Si no existe → abre el alta con el código QR autocompletado.
  - Alertas de stock mínimo, baja lógica, ajuste rápido de stock ±.
- **Punto de venta (POS)** con carrito, búsqueda y escaneo, cobro con vuelto,
  4 métodos de pago (efectivo, tarjeta, Yape/Plin, transferencia).
- **Caja persistente**: el estado sobrevive a recargas del navegador
  (localStorage + reconciliación con Supabase). Sin caja abierta no hay ventas.
- **Ventas atómicas** vía RPC `procesar_venta` (descuento de stock con bloqueo
  `FOR UPDATE`, IGV 18 % desglosado, correlativo).
- **Anulación** de ventas con reposición de stock (`anular_venta`).
- **Cierre de caja** con arqueo (sobrante / faltante) y reporte diario PDF.
- **Tickets 80 mm** para impresora térmica (`@media print`) + exportación a PDF.
- **PWA** instalable, lista para usar en celular como app.

---

## 🧱 Stack

| Capa        | Tecnología                                            |
| ----------- | ----------------------------------------------------- |
| Frontend    | React 18, TypeScript, Vite 5, React Router 6          |
| Estilos     | Tailwind CSS 3 (paleta "Dorsal 07")                   |
| Backend     | Supabase (PostgreSQL, Auth, RLS, RPC)                 |
| QR          | html5-qrcode                                          |
| PDF         | jsPDF + jspdf-autotable                               |
| PWA         | vite-plugin-pwa (Workbox)                             |

---

## 🚀 Puesta en marcha

### 1. Base de datos (Supabase)

1. Entra al panel de tu proyecto Supabase → **SQL Editor**.
2. Copia y ejecuta **todo** el contenido de [`sql/schema.sql`](./sql/schema.sql).
   - Crea tablas (`productos`, `cajas`, `ventas`, `detalle_ventas`),
     políticas RLS, triggers y las funciones RPC.
   - Inserta 4 productos de ejemplo (puedes borrarlos luego).

### 2. Crear el usuario de la tienda

En Supabase → **Authentication → Users → Add user**, crea un usuario con
correo y contraseña. Con ese usuario se inicia sesión en el sistema.

### 3. Variables de entorno

El archivo `.env` ya viene configurado con las credenciales del proyecto.
Si necesitas cambiarlas, edítalo (o copia desde `.env.example`):

```env
VITE_SUPABASE_URL=https://gwxksyrpgjfehcfezlhd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> La _anon key_ es pública por diseño; la seguridad la garantiza RLS.

### 4. Instalar y ejecutar

```bash
npm install
npm run dev      # entorno de desarrollo  → http://localhost:5173
```

> **Cámara / QR:** el navegador solo permite la cámara en `localhost` o bajo
> **HTTPS**. En producción despliega siempre con certificado SSL.

### 5. Compilar para producción

```bash
npm run build    # genera /dist
npm run preview  # sirve /dist localmente para probar
```

---

## ☁️ Despliegue (Vercel / Netlify)

1. Sube el repositorio a GitHub.
2. Importa el proyecto en **Vercel** (o Netlify).
3. Define las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Build command: `npm run build` · Output: `dist`.
5. El dominio queda con HTTPS automático → la cámara QR funcionará.

---

## 📁 Estructura del proyecto

```
urban-seven-pos/
├── public/
│   └── img/
│       ├── logo.png          # logo de marca (login, panel, tickets, PWA)
│       └── favicon.png
├── sql/
│   └── schema.sql            # tablas + RLS + triggers + RPC (idempotente)
├── src/
│   ├── components/
│   │   ├── Layout.tsx         # navegación lateral (desktop) e inferior (móvil)
│   │   ├── Logo.tsx           # logo con fallback al numeral 07
│   │   ├── Modal.tsx          # modal / bottom-sheet
│   │   ├── ProductoForm.tsx   # alta y edición de prendas
│   │   ├── QRScanner.tsx      # escáner de cámara
│   │   ├── TicketModal.tsx    # ticket 80 mm en pantalla + PDF
│   │   └── Toast.tsx          # notificaciones
│   ├── context/
│   │   ├── AuthContext.tsx    # sesión Supabase
│   │   └── CajaContext.tsx    # caja persistente (localStorage + Supabase)
│   ├── lib/
│   │   ├── constants.ts       # marca, IGV, categorías, tallas, métodos
│   │   └── supabase.ts        # cliente Supabase
│   ├── pages/
│   │   ├── Dashboard.tsx      # inicio: resumen del turno + alertas de stock
│   │   ├── Login.tsx          # acceso + soporte WhatsApp
│   │   ├── Inventario.tsx     # CRUD + escaneo QR
│   │   ├── POS.tsx            # punto de venta
│   │   ├── Ventas.tsx         # historial + anulación + reimpresión
│   │   └── Caja.tsx           # apertura, arqueo y cierre
│   ├── types/
│   │   └── index.ts           # tipos del dominio
│   ├── utils/
│   │   ├── format.ts          # moneda PEN, fechas, folios
│   │   └── pdf.ts             # ticket 80 mm + reporte diario A4
│   ├── App.tsx                # router + providers
│   ├── main.tsx               # punto de entrada + registro PWA
│   └── index.css              # Tailwind + utilidades + CSS de impresión
├── .env                       # credenciales activas
├── .env.example
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🧮 Notas de negocio

- **IGV 18 %**: el `precio_venta` es el precio **final con IGV incluido**.
  El desglose se calcula hacia atrás: `base = total / 1.18`.
- **Una caja abierta por usuario**: garantizado con un índice único parcial.
- **Correlativo de venta**: secuencial por la columna `identity` en `ventas`.
- Al **cerrar caja**, el resumen del panel y las últimas ventas se limpian
  en la UI (quedan archivadas en la base) para el siguiente turno.

---

## 🆘 Soporte

¿Problemas para acceder o usar el sistema?
**WhatsApp:** <https://wa.me/51924996961>

---

© 2026 URBAN SEVEN · Viste la ciudad con actitud.
