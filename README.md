# Trivia de la Movilidad

Aplicación web estática para aprendizaje preventivo gamificado sobre movilidad segura.

## Funciones para participantes

- Registro con nombre de usuario, clave y sucursal.
- Clave con mínimo 6 caracteres, una letra mayúscula y un número.
- Una trivia diaria por participante.
- Indicadores mensuales de respuestas correctas, incorrectas, efectividad y oportunidades.
- Reinicio automático de indicadores al comenzar un nuevo mes.
- Historial personal completo, sin perder los registros de meses anteriores.
- Banco programado con 600 preguntas: 200 de movilidad a pie, 200 de vehículos y 200 de bicicleta/scooter.

## Funciones del administrador

- Acceso separado, sin participación en la trivia diaria.
- Dashboard filtrable por mes y año, desde 2026 hasta 2100.
- Personas participantes, cantidad y porcentaje de respuestas correctas e incorrectas.
- Ranking mensual por cantidad de preguntas respondidas.
- Descarga de resultados en CSV compatible con Microsoft Excel.
- Registro de usuarios, sucursales y fecha de creación.
- Cambio de nombre de usuario, sucursal y restablecimiento de clave.
- Banco de 600 preguntas con búsqueda por día, mes, año y texto.
- Edición de fecha, categoría, pregunta, alternativas, respuesta correcta y explicación.
- Sección independiente de sorteo de premio.
- Sorteo exclusivo entre quienes tengan la mayor cantidad de oportunidades del periodo seleccionado.
- Historial de sorteos realizados.

## Programación del banco

- Primera pregunta: 1 de enero de 2026.
- Última pregunta: 23 de agosto de 2027.
- Total: 600 días consecutivos.

## Credenciales de administración

- Usuario: `diegogonzalez`
- Clave: `diegotrivia`

## Publicación en GitHub

1. Crea un repositorio nuevo.
2. Descomprime el ZIP.
3. Sube directamente a la raíz del repositorio:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `vercel.json`
   - `.gitignore`
   - `README.md`
4. Confirma el commit en la rama `main`.

## Despliegue en Vercel

1. Selecciona **Add New > Project**.
2. Importa el repositorio de GitHub.
3. Usa **Framework Preset: Other**.
4. Deja vacío **Build Command**.
5. Usa la raíz del repositorio como **Root Directory**.
6. Despliega.

## Seguridad de las claves

Las claves se almacenan como hash y no se muestran en texto visible. El administrador puede establecer una nueva clave, pero no recuperar la clave anterior.

## Advertencia técnica importante

Esta versión continúa usando `localStorage`. Los usuarios, respuestas y sorteos quedan guardados solamente en el navegador y dispositivo donde fueron creados. Esto significa que, aunque la aplicación se publique en Vercel, el administrador no verá automáticamente los registros realizados desde otros computadores o teléfonos.

Para una implementación corporativa real se debe conectar la aplicación a una base de datos centralizada y autenticación de servidor, por ejemplo Supabase, Firebase o Microsoft Entra ID.
