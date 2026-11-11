# Sonora Client App - Portal de Práctica Musical 🎵

Portal web exclusivo de solo lectura para clientes y alumnos, diseñado para explorar, reproducir y practicar interactivamente ejercicios musicales (Batería, Bajo, Guitarra y Piano) creados en el Studio Builder.

---

## 🚀 Características Principales

- **Acceso Exclusivo de Solo Lectura:** Sin barras de edición, formularios de creación ni botones destructivos.
- **Catálogo Público de Ejercicios:**
  - Filtro por instrumento: *Todos*, *Bajo*, *Guitarra*, *Piano* y *Batería*.
  - Buscador en tiempo real por título y categoría.
  - Tarjetas interactivas con tempo (BPM), número de compases y nivel de dificultad.
- **Atril de Práctica Interactivo:**
  - Visualizador de partitura/tablatura SVG multi-compás continuo con renderizado por sistemas y clave musical dinámica.
  - Cursor de reproducción animado (`playhead`) sincronizado en tiempo real con auto-scroll suave.
  - Control de velocidad porcentual (`50%`, `75%`, `100%`) con recálculo dinámico de BPM.
  - Metrónomo sonoro integrable y cuenta atrás visual (3, 2, 1) antes de comenzar la sesión.
  - Modo bucle continuo (`Loop ON / OFF`).
- **Motores de Audio Acústicos y Síntesis Nativa:**
  - **Piano de Cola:** Muestras de audio acústico (*FluidR3_GM*) con pitch-shifting y control de velocidad.
  - **Bajo y Guitarra:** Síntesis nativa con Web Audio API (formas de onda optimizadas, filtros paso bajo y curvas ADSR).
  - **Batería:** Sintetizador analógico de bombo, caja y platos (white noise buffers).
- **Conectividad Cloud:** Conectado directamente a **Neon PostgreSQL** a través de **Prisma ORM**.

---

## 🛠️ Tecnologías

- **Framework:** [Next.js](https://nextjs.org/) (App Router, Turbopack, Cache Components)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/)
- **ORM & Base de Datos:** [Prisma ORM](https://www.prisma.io/) + [Neon PostgreSQL](https://neon.tech/)
- **Audio:** Web Audio API nativo del navegador

---

## 📦 Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone https://github.com/abel322/practica-instrumento-cliente.git
cd practica-instrumento-cliente
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:
```env
DATABASE_URL="postgresql://usuario:contraseña@ep-xxxx.aws.neon.tech/nombre-db?sslmode=require"
```

### 4. Generar el cliente de Prisma
```bash
npx prisma generate
```

### 5. Iniciar el servidor de desarrollo
```bash
npm run dev
```
Abre tu navegador en [http://localhost:3000](http://localhost:3000).

---

## 📁 Estructura del Proyecto

```text
sonora-client-app/
├── app/
│   ├── api/
│   │   └── exercises/[id]/route.ts  # Endpoint de lectura por ID
│   ├── practice/[id]/page.tsx       # Atril de práctica interactivo
│   ├── layout.tsx                   # Layout global con metadatos
│   └── page.tsx                     # Catálogo público con filtros y búsqueda
├── components/
│   └── ScoreViewer.tsx              # Renderizador SVG multi-compás
├── lib/
│   ├── audio/
│   │   └── clientAudioEngines.ts    # Motores de audio Web Audio API
│   ├── exercises.ts                 # Normalizador y consultas Neon DB
│   └── prisma.ts                    # Cliente Prisma Singleton
└── prisma/
    └── schema.prisma                # Esquema introspectado de Neon DB
```
