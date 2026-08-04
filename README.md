# Trivia de la Movilidad

MVP estático de una aplicación corporativa de aprendizaje preventivo gamificado.

## Funciones incluidas

- Registro con nombre de usuario, clave y sucursal.
- Claves con mínimo 6 caracteres, una mayúscula y un número.
- Accesos separados para participantes y administración.
- Una trivia diaria por participante.
- Ranking, historial, oportunidades y sorteos.
- Panel administrador para gestionar preguntas y exportar información.

## Publicación en GitHub

1. Crea un repositorio nuevo.
2. Sube en la raíz: `index.html`, `styles.css`, `app.js`, `vercel.json`, `.gitignore` y este `README.md`.
3. Confirma el commit en la rama `main`.

## Despliegue en Vercel

1. Selecciona **Add New > Project**.
2. Importa el repositorio de GitHub.
3. Usa **Framework Preset: Other**.
4. Deja vacío **Build Command**.
5. Usa la raíz del repositorio como **Root Directory**.
6. Despliega.

## Advertencia técnica

Esta versión usa `localStorage`. Cada navegador conserva sus propios usuarios, respuestas y sorteos. Es adecuada para demostración y validación del flujo, pero una implementación corporativa compartida requiere autenticación del lado del servidor y una base de datos centralizada.
