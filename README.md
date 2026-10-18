# Startup Mobile Frontend (React Native + Expo)

Aplicación Mobile (React Native + Expo) para la plataforma on-demand de servicios independientes con soporte de Rol Dual y pagos en Escrow.

---

## 📱 Módulos Implementados

### 1. Issue #7 - Pantalla de Onboarding
- **Carrusel de 4 Pantallas**: Presentación general, Rol Cliente, Rol Trabajador, Bienvenida.
- **Persistencia Local**: AsyncStorage (`@startup_app/onboarding_completed`).
- **Navegación Condicional**: Salteo de Onboarding si ya se completó previamente.

### 2. Issue #8 - Pantalla de Registro (`RegisterScreen`)
- **Campos del Formulario**: Nombre, Apellido, Correo Electrónico, Teléfono Móvil, Contraseña, Confirmar Contraseña, Términos y Condiciones.
- **Validaciones en Tiempo Real**:
  - Formato de Email (regex estándar).
  - Teléfono (8 a 15 dígitos numéricos/internacionales).
  - Complejidad de Contraseña: Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 símbolo.
  - Coincidencia exacta de contraseñas.
  - Aceptación obligatoria de Términos y Condiciones.
- **Componentes Modulares (<150 líneas cada uno)**:
  - `RegisterFormInput.tsx`: Campo de entrada responsivo con visibilidad de contraseña toggleable y accesibilidad WCAG AA.
  - `PasswordRequirements.tsx`: Indicador visual dinamico con checklist de requisitos de contraseña.
  - `RegisterTermsRow.tsx`: Checkbox con enlace directo al documento de Términos y Condiciones.
  - `TermsModal.tsx`: Modal con los términos legales y botón de aceptación.
- **Integración API & Manejo de Errores**:
  - Módulo `src/services/api.ts` con reintentos por backoff exponencial y timeout.
  - Endpoint `POST /auth/register` en `authService.ts`.
  - Manejo de errores de conflicto (409 Email/Teléfono duplicado) y errores de red.
- **Flujo de Navegación**:
  - Navegación a pantalla de "Verificación de OTP" tras registro exitoso.
  - Enlace direct a "Iniciar Sesión" (Login).

### 3. Issue #23 - Gestión de Ubicaciones (`LocationsScreen`)
- **Acceso**: desde "Mi Perfil" → "Mis Ubicaciones" (`ProfileScreen` → `LocationsScreen`).
- **Listado**: direcciones guardadas con mapa de vista general (un pin por ubicación) y badge de "Principal".
- **Cercanía (lógica tipo Google Maps)**: al abrir la pantalla se piden **permisos de ubicación** (`expo-location`); con la posición del dispositivo se consulta `GET /users/:id/locations?lat=&lng=` para obtener la distancia real a cada dirección y se **ordenan de más cercana a más lejana**, mostrando la distancia en cada tarjeta. El mapa se centra en tu posición y dibuja el punto azul. Si se rechaza el permiso aparece un banner con "Activar" para volver a pedirlo.
- **Alta/Edición** (modal): búsqueda de direcciones + mapa interactivo para fijar coordenadas.
  - Búsqueda de direcciones (con debounce) vía **OpenStreetMap Nominatim** (sin API key).
  - Mapa interactivo (ver *Mapas*): tocar el mapa o arrastrar el pin actualiza las coordenadas y resuelve la dirección por reverse-geocoding.
  - Botón **"Usar mi ubicación actual"** para fijar el pin en tu posición y resolver la dirección automáticamente.
- **Mapa expandible**: tanto el mapa del formulario como el de vista general se pueden abrir a **pantalla completa** (botón de expandir) y recentrar en tu ubicación (botón de crosshair).
- **Eliminar** con diálogo de confirmación y **marcar como principal**.
- **Endpoints**: `GET /users/:id/locations` (opcional `?lat=&lng=`), `POST /users/:id/locations`, `PATCH /locations/:location_id`, `DELETE /locations/:location_id`.
- **Estados visuales**: loading (spinner), error (con "Reintentar"), empty ("No tenés ubicaciones guardadas"), banner de permiso, guardando/eliminando y pull-to-refresh.
- **Límites**: máximo 10 ubicaciones por usuario (lo impone el backend); al alcanzarlo se oculta el alta y se muestra un aviso.
- **Componentes**: `components/location/` → `LeafletMap`, `LocationMapPicker`, `LocationsMapPreview`, `AddressSearchInput`, `LocationCard`, `LocationFormModal`, `ConfirmDialog`.
- **Configuración opcional**: `EXPO_PUBLIC_GEOCODING_URL` para cambiar de proveedor de geocoding (por defecto `https://nominatim.openstreetmap.org`).

#### Mapas (WebView + Leaflet + OpenStreetMap)
Los mapas **no** usan `react-native-maps`. Se dibujan con **Leaflet** dentro de un **`react-native-webview`** (`components/location/LeafletMap.tsx`) usando mosaicos de **OpenStreetMap**, para que funcionen en **Expo Go** sin API key.

- **Por qué**: desde Expo SDK 55, Expo Go **dejó de soportar Google Maps**; en Android `react-native-maps` se apoya en el SDK de Google y el mapa queda **en negro con el logo de Google**. Además, ese SDK exige una Google Maps API key **incluso para tiles propios** (`UrlTile`), así que la WebView evita por completo esa dependencia.
- **Comunicación RN ↔ mapa**: React Native envía comandos con `injectJavaScript` y el mapa responde eventos (`press`, `markerPress`, `markerDragEnd`, `ready`, `error`) con `postMessage`.
- **Leaflet** se carga desde CDN (`unpkg.com/leaflet@1.9.4`) y los tiles desde `tile.openstreetmap.org`. Por eso el mapa necesita conexión a internet; si no cargan, se muestra un estado de error con botón **"Reintentar"**.
- **Política de uso de OSM**: el proveedor público es apto para desarrollo/prototipo; para producción con mucho tráfico conviene un proveedor de tiles propio.
- **Alternativa**: si preferís volver a `react-native-maps`, hay que crear una **Google Maps API key** y usar un **development build** (no funciona en Expo Go); no es un cambio de código puro.
- **Permisos**: el plugin `expo-location` en `app.json` define el texto de `NSLocationWhenInUseUsageDescription`; en Android agrega los permisos `ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION`.


---

## 🏗️ Estructura del Proyecto

```
Frontend/src/
├── theme/tokens.ts                  # Tokens del sistema de diseño (modo oscuro)
├── types/
│   ├── onboarding.ts
│   ├── auth.ts                      # Interfaces de Registro y Autenticación
│   └── location.ts                  # Tipos de ubicaciones guardadas
├── services/
│   ├── api.ts                       # Cliente API centralizado (backoff retry + timeout)
│   ├── authService.ts               # Llamadas a endpoints de Auth
│   ├── locationService.ts           # CRUD de ubicaciones guardadas
│   ├── deviceLocation.ts            # Ubicación del dispositivo (expo-location)
│   └── geocodingService.ts          # Búsqueda/reverse-geocoding (Nominatim)
├── hooks/
│   ├── useOnboarding.ts
│   ├── useRegisterForm.ts           # Hook personalizado con validación y estados
│   ├── useLocations.ts              # Lista + CRUD de ubicaciones (orden por cercanía)
│   ├── useDeviceLocation.ts         # Permiso + posición del dispositivo
│   └── useLocationForm.ts           # Estado del formulario de ubicación
├── utils/
│   └── map.ts                       # Centro/zoom, tiles OSM y formato de distancia
├── components/
│   ├── onboarding/                  # Subcomponentes de Onboarding
│   ├── register/
│   │   ├── RegisterFormInput.tsx    # Input con accesibilidad y toggle de contraseña
│   │   ├── PasswordRequirements.tsx # Checklist de complejidad de contraseña
│   │   ├── RegisterTermsRow.tsx     # Checkbox de términos y condiciones
│   │   └── TermsModal.tsx           # Modal de términos y condiciones
│   └── location/
│       ├── LeafletMap.tsx           # Mapa WebView + Leaflet + OSM (sin API key)
│       ├── LocationMapPicker.tsx    # Mapa interactivo (pin arrastrable, expandible)
│       ├── LocationsMapPreview.tsx  # Mapa de solo lectura con pins (expandible)
│       ├── AddressSearchInput.tsx   # Búsqueda de direcciones (debounced)
│       ├── LocationCard.tsx         # Ítem de la lista de ubicaciones
│       ├── LocationFormModal.tsx    # Modal de alta/edición
│       └── ConfirmDialog.tsx        # Confirmación de acciones destructivas
├── screens/
│   ├── OnboardingScreen.tsx
│   ├── RegisterScreen.tsx           # Contenedor de la pantalla de Registro (<150 líneas)
│   └── LocationsScreen.tsx          # Gestión de ubicaciones guardadas
└── navigation/AppNavigator.tsx      # Ruteo principal (Onboarding, Register, OTP, Login, Perfil, Ubicaciones)
```

---

## 🧪 Ejecutar Pruebas y Cobertura

```bash
# Ejecutar todas las pruebas unitarias e integración
npm test

# Ejecutar reporte de cobertura de código (mínimo 70% requerido)
npm run test:coverage
```