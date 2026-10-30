# CheckU Web

Aplicación web para administrar y consultar la actividad académica de una institución. CheckU reúne en un solo lugar la gestión de usuarios, clases, sesiones, asistencia y justificantes, además de ofrecer reportes e indicadores según el rol de cada persona.

## Funcionalidades

- Inicio de sesión, registro y recuperación de contraseña.
- Panel principal y administración de la cuenta.
- Gestión de usuarios, clases y otros recursos académicos.
- Consulta de sesiones, asistencia y justificantes.
- Reportes de asistencia y actividad, con filtros por periodo.
- Módulo de proximidad y registros de auditoría para los roles autorizados.

## Tecnologías

- React 19 y TypeScript
- Vite 8
- React Router

## Requisitos

- Node.js 20.19 o posterior, o Node.js 22.12 o posterior.
- npm.
- Acceso a la API backend de CheckU. Si no se configura otra dirección, la aplicación usa `http://127.0.0.1:8000`.

## Descargar e instalar

Clona el repositorio y entra al directorio del proyecto:

```bash
git clone <URL_DEL_REPOSITORIO>
cd checku-web
```

Instala las dependencias:

```bash
npm install
```

Si el repositorio incluye `package-lock.json`, también puedes instalar las versiones bloqueadas con `npm ci`.

## Configurar la API

La aplicación obtiene sus datos del backend de CheckU. Para usar una URL distinta a la predeterminada, crea un archivo `.env` en la raíz del proyecto y define:

```env
VITE_API_URL=https://tu-api.example.com
```

Reemplaza el valor por la URL base de tu API. No incluyas rutas como `/api/v1` al final. Reinicia el servidor de desarrollo después de cambiar esta configuración.

## Ejecutar en desarrollo

```bash
npm run dev
```

Vite mostrará en la terminal la dirección local para abrir la aplicación en el navegador.

## Compilar para producción

```bash
npm run build
```

Este comando comprueba los tipos de TypeScript y genera los archivos optimizados en `dist/`.

Para probar localmente la compilación:

```bash
npm run preview
```

## Otros comandos

```bash
npm run lint
```

Ejecuta ESLint para revisar el código fuente.
