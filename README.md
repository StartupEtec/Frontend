# Startup Mobile Frontend (React Native + Expo)

Aplicación Mobile (React Native + Expo) para la plataforma on-demand de servicios independientes con soporte de Rol Dual, chats en tiempo real, cotizaciones, pagos en Escrow y geolocalización.

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#-requisitos-previos)
2. [Configuración Local](#-configuración-local)
3. [Ejecutar la App con Expo](#-ejecutar-la-app-con-expo)
4. [Levantar con Docker](#-levantar-con-docker)
5. [Estructura del Proyecto](#-estructura-del-proyecto)
6. [Conexión con el Backend](#-conexión-con-el-backend)
7. [Módulos Implementados](#-módulos-implementados)
8. [Pruebas](#-pruebas)
9. [Seguridad](#-seguridad)
10. [Troubleshooting](#-troubleshooting)
11. [Documentación Relacionada](#-documentación-relacionada)

---

## 🔧 Requisitos Previos

| Herramienta | Versión | Notas |
|-------------|---------|-------|
| **Node.js** | v22.13+ | Requerido por Expo SDK 58 |
| **npm** | v10+ | Gestiona dependencias |
| **Expo Go** | App móvil | Para probar en dispositivo físico sin build |

> El frontend consume la API del Backend. Asegúrate de tener el backend levantado y accesible antes de iniciar la app.

---

## ⚙️ Configuración Local

### 1. Clonar el repositorio

```bash
git clone https://github.com/StartupEtec/Frontend.git Frontend
cd Frontend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Levantar el backend

El frontend necesita el backend disponible. Levanta el backend según la documentación de su repositorio y obtén su URL pública.

---


---

## 🚀 Ejecutar la App con Expo

```bash
# Inicia Metro (bundler de Expo)
npm start
```

Luego escanea el código QR con la app **Expo Go** (Android o iOS) en tu dispositivo físico.

> La aplicación se ha probado con **Expo Go** (Android e iOS).

---

## 🐳 Levantar con Docker

El frontend incluye `Dockerfile` y `docker-compose.yml` para despliegue contenedorizado.

```bash
cd Frontend

# Construir y levantar (puerto 8081)
docker compose up -d --build

# Ver logs
docker compose logs -f frontend

# Detener
docker compose down
```

- El contenedor se construye sobre `node:22-slim`.
- El archivo `.env` **no se copia en la imagen**; las variables se inyectan en runtime vía `env_file`.

---

## 📂 Estructura del Proyecto

```
Frontend/
├── App.tsx                          # Punto de entrada de la app
├── app.json                         # Configuración de Expo
├── Dockerfile                       # Imagen de producción
├── docker-compose.yml               # Orquestación de contenedores
├── .env.example                     # Plantilla de variables de entorno
├── package.json                     # Dependencias y scripts
├── tsconfig.json                    # Configuración de TypeScript
└── src/
    ├── components/                  # Componentes reutilizables
    ├── hooks/                       # Hooks personalizados
    ├── navigation/                  # Ruteo principal
    ├── screens/                     # Pantallas de la app
    ├── services/                    # Servicios de API
    ├── types/                       # Tipos TypeScript
    ├── utils/                       # Utilidades
    └── context/                     # Contextos de React
```

---

## 🔌 Conexión con el Backend

El cliente API centralizado (`src/services/api.ts`) gestiona la comunicación con el backend:

- **URL base**: `EXPO_PUBLIC_API_URL` (defecto `http://localhost:3000/api/v1`).
- **Timeout**: 10 segundos por petición.
- **Reintentos**: 2 reintentos con backoff exponencial.
- **Refresh de sesión**: renovación automática de access token usando refresh token.
- **Autenticación**: header `Bearer <accessToken>` en endpoints protegidos.

La especificación completa de la API está disponible en la documentación del backend (OpenAPI/Swagger).

---

## 🧩 Módulos Implementados

### Onboarding (Issue #7)
Carrusel de 4 pantallas de bienvenida (presentación, rol cliente, rol trabajador, bienvenida) con persistencia local y navegación condicional.

### Registro (Issue #8)
Pantalla de registro de usuario con validaciones en tiempo real: formato de email, teléfono, complejidad de contraseña, coincidencia de contraseñas y aceptación de términos.

### Ubicaciones (Issue #23)
Gestión de ubicaciones guardadas con listado ordenado por cercanía, mapa interactivo, búsqueda de direcciones y permisos de ubicación.

### Búsqueda de Trabajadores (Issue #24)
Búsqueda de trabajadores cercanos en mapa y lista con filtros por categoría, colores de pins según área de cobertura y vista lista con búsqueda por nombre, calificación y ordenamiento.

### Perfil de Trabajador (Vista Cliente) (Issue #26)
Perfil público del trabajador con avatar, nombre, categoría, calificación, distancia, biografía, galería de trabajos y pestaña de reseñas.

### Chats (Issue #30)
Lista de conversaciones estilo WhatsApp con búsqueda por nombre y acceso a conversaciones individuales.

### Mensajería en Tiempo Real (Issue #31)
Conversaciones en tiempo real con envío de mensajes de texto, indicador de escritura y soporte para adjuntos de imagen.

### Cotizaciones (Issue #35)
Flujo de cotizaciones: solicitar cotización desde el chat, completar cotización como trabajador, aceptar/rechazar como cliente y ver detalle de cotización.

### Órdenes / Mis Pedidos (Issue #45)
Pantalla de órdenes con dos pestañas (Pendientes y Realizados), botón para finalizar servicio y detalle de cada orden.

### Calificación de Servicio (Issue #48)
Pantalla para calificar un servicio completado con estrellas, comentario y registro de la calificación.

---

## 🧪 Pruebas

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar con reporte de cobertura
npm run test:coverage
```

- **Stack**: Jest + `@testing-library/react-native`.

---

## 🛡️ Seguridad

- Los tokens de autenticación se almacenan de forma segura en el dispositivo.
- Las variables de entorno sensibles (`.env`) quedan fuera del repositorio.
- Las contraseñas se hashean en el backend (nunca viajan en texto plano desde el frontend).

---

## 🔧 Troubleshooting

| Problema | Solución |
|----------|----------|
| Expo no conecta al backend | Verifica que `EXPO_PUBLIC_API_URL` en `.env` apunte a la URL correcta del backend. |
| QR no se escanea | Asegura que el dispositivo y la computadora estén en la misma red Wi-Fi. |
| Error de permisos de ubicación | Habilita los permisos de ubicación en la app del dispositivo. |

---

## 📖 Documentación Relacionada

- **Backend**: https://github.com/StartupEtec/Backend
- **Especificación OpenAPI**: Documentación interactiva de los endpoints del backend (Swagger/OpenAPI).
