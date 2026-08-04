# Trivia de la Movilidad

MVP estático de una aplicación corporativa de aprendizaje preventivo gamificado.

## Funciones incluidas

- Registro con nombre de usuario, clave y sucursal.
- Claves con mínimo 6 caracteres, una mayúscula y un número.
- Accesos separados para participantes y administración.
- Una trivia diaria por participante.
- Indicadores mensuales de respuestas, aciertos, errores, efectividad y oportunidades.
- Reinicio automático de los indicadores al cambiar de mes, conservando el historial personal completo.
- Instrucciones de participación destacadas en la página de inicio.
- Categoría de la trivia con mayor visibilidad.
- Ranking mensual visible solo para el administrador, ordenado por oportunidades.
- Descarga del ranking en CSV compatible con Microsoft Excel.
- Panel administrador para gestionar preguntas, sorteos y respaldos.

## Credenciales de administración

- Usuario: `diegogonzalez`
- Clave: `diegotrivia`

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
