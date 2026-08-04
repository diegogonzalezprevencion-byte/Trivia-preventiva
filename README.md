# Trivia de la Movilidad — Supabase

Versión corregida para GitHub y Vercel.

## Archivos necesarios en la raíz

- `index.html`
- `styles.css`
- `app.js`
- `package.json`
- `vercel.json`
- `.gitignore`

## Configuración automática en Vercel

- Framework: Vite
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`
- Node.js: 20 o superior

Las dependencias usan versiones estables existentes:

- `@supabase/supabase-js` 2.111.0
- `vite` 8.1.5

La versión anterior indicaba Vite 8.2.0, que no era una versión estable disponible y podía hacer fallar el despliegue. Si un despliegue falla, Vercel conserva el anterior, por lo que la página puede seguir mostrando archivos antiguos.
