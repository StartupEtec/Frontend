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
  - Mapa interactivo (ver _Mapas_): tocar el mapa o arrastrar el pin actualiza las coordenadas y resuelve la dirección por reverse-geocoding.
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
- **Comunicación RN ↔ mapa**: React Native envía comandos con `injectJavaScript` y el mapa responde eventos (`press`, `markerPress`, `markerDragEnd`, `moveend`, `ready`, `error`) con `postMessage`.
- **Leaflet** se carga desde CDN (`unpkg.com/leaflet@1.9.4`) y los tiles desde `tile.openstreetmap.org`. Por eso el mapa necesita conexión a internet; si no cargan, se muestra un estado de error con botón **"Reintentar"**.
- **Política de uso de OSM**: el proveedor público es apto para desarrollo/prototipo; para producción con mucho tráfico conviene un proveedor de tiles propio.
- **Alternativa**: si preferís volver a `react-native-maps`, hay que crear una **Google Maps API key** y usar un **development build** (no funciona en Expo Go); no es un cambio de código puro.
- **Permisos**: el plugin `expo-location` en `app.json` define el texto de `NSLocationWhenInUseUsageDescription`; en Android agrega los permisos `ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION`.

### 4. Issue #24 - Búsqueda de Trabajadores en Mapa (`WorkerSearchScreen`)

- **Acceso**: desde la **Pantalla Principal** → botón **"Buscar Trabajadores"** → **pop-up con las ubicaciones guardadas** (`SearchOriginModal`, mismo patrón visual que el modal de cambio de rol): lista `GET /users/:id/locations`, resalta la elegida previamente y siempre ofrece **"＋ Agregar ubicación"** (si no hay ninguna guardada es la salida del estado vacío). El botón envía **directo al formulario de alta** de una ubicación y, al volver, el pop-up **se reabre** para que siga con la búsqueda.
- **Mapa interactivo desde la ubicación elegida**: la ubicación guardada que elija el usuario reemplaza a la del dispositivo: es el **centro inicial del mapa** (sin pedir permiso y sin esperar GPS: la pantalla abre al instante) y la **referencia fija de la sesión** para los colores de cobertura. Un botón flotante **recentra** en esa ubicación si el usuario exploró otra zona.
- **Búsqueda automática al mover el mapa**: el evento `moveend` de Leaflet reporta el centro y zoom visibles; cada gesto de pan/zoom re-consulta los trabajadores alrededor del **centro visible** (radio fijo de 100 km: no hay filtro de distancia). Un guard ignora los recentrados hechos por código para evitar bucles y una tolerancia de ~20 m (`CENTER_EPSILON`) absorbe micro-paneos y el redondeo por píxel de Leaflet sin re-consultar.
- **Filtro de categoría**: pills horizontales con las 32 categorías del seed (`types/worker.ts` espeja `Backend/src/database/seeds/01_categories.js`; el backend no expone `GET /categories`). Cambiar de categoría re-consulta en el mismo centro, sin mover el mapa.
- **Pines y ficha resumida**: al tocar un pin se abre una ficha con **nombre, calificación (★), tarifa por hora y distancia**, más los botones **"Ver Perfil Completo"** y **"Solicitar Servicio"** (muestra un aviso "Próximamente": el flujo de cotización es un issue futuro).
- **Pines según el área de cobertura**: el color de cada pin compara la **ubicación elegida** (fija durante la sesión; no la del dispositivo ni el centro visible tras paneos) contra `coverage_radius_km` del trabajador — **verde** (`workerAccent`) si está dentro del área, **verde apagado** (`workerAccentDim`) si está afuera pero por menos de 5 km (`COVERAGE_NEAR_BAND_KM`), **gris** (`workerOut`) si está más lejos o no definió área. Al elegir otra ubicación en el pop-up los colores se recalculan. La distancia se calcula en el cliente con haversine (`distanceKmBetween` / `coverageTier` en `utils/map.ts`). El mapa también lleva **un pin propio de la ubicación elegida** (color del rol, dirección como título, igual que en "Mis Ubicaciones") que señala el punto de referencia aunque el mapa se panee a mano; tocarlo no abre ninguna ficha.
- **Contador de resultados**: "N trabajadores encontrados" (o "N+" al llegar al límite de 50 por consulta) e indicador de refresco en segundo plano.
- **Vista lista ↔ mapa**: botón en el header para alternar; la lista muestra las mismas tarjetas con sus acciones.
- **Estabilidad del mapa (anti-temblor)**: la fila del contador de resultados siempre está montada con **altura fija** (si apareciera/desapareciera según los resultados, la WebView se redimensiona, Leaflet re-centra con `invalidateSize` y el mapa entraba en un bucle visible de temblor); `setView` **ignora** recentrados al mismo punto/zoom (guard de ~25 m) para cortar el eco `moveend` → `setView` → `moveend`, y se aplica **sin animación** (`animate: false`: un pan animado sobre tiles cargando se ve como salto); `invalidateSize` solo se ejecuta cuando el tamaño de la WebView **realmente cambió** (ignora tamaños en 0 —pantalla oculta— y repetidos); y los pines se **reconcilian de forma diferencial**: los que siguen presentes solo actualizan posición/color, sin borrar y re-crear todo el conjunto (sin parpadeo en cada recarga).
- **Apertura y vuelta rápidas**: la búsqueda ya **no depende de la ubicación del dispositivo** (no pide permiso ni espera GPS: abre al instante en la ubicación elegida), y `useNearbyWorkers` cachea la **última búsqueda exitosa de la sesión** por centro/radio/categoría (nivel módulo) y la revalida en silencio, así un remontaje de la pantalla —o elegir una ubicación ya consultada— arranca con resultados al instante. (`deviceLocation` sigue usándose en el formulario de ubicaciones, con su atajo de última posición conocida ≤ 60 s.)
- **Perfil mínimo del trabajador (`WorkerProfileScreen`)**: desde "Ver Perfil Completo" se abre la ficha pública (`GET /users/:id`, sin auth) con avatar, nombre, categoría, badges **Disponible/Certificado**, calificación, distancia, tarifa, un indicador chico de **"Estás en su área de cobertura"** calculado contra la **ubicación elegida para buscar** (o "Fuera de su área por poco / de cobertura", con la distancia al límite, y "Este trabajador no definió su área de cobertura" si no tiene radio), biografía y **"Solicitar Servicio"** (también "Próximamente"). Los datos básicos vienen de la búsqueda y la bio/rating fresco se cargan aparte, con su propio loading, error y "Reintentar".
- **Endpoints**: `GET /workers/nearby?latitude=&longitude=&radius_km=&category_id?=&limit=&offset?`, `GET /users/:id`, `GET /users/:id/locations`.
- **Estados visuales**: spinner "Buscando trabajadores...", error con "Reintentar", banner de resultados viejos si falla un refresco, estado vacío en mapa y en lista ("No hay trabajadores disponibles por ahora"); en el pop-up: "Cargando tus ubicaciones...", error con "Reintentar" y estado vacío con el botón de agregar.
- **Componentes**: `components/worker/` → `WorkerFilters`, `WorkerCard`; `components/location/` → `SearchOriginModal`; `screens/` → `WorkerSearchScreen`, `WorkerProfileScreen`; `hooks/` → `useNearbyWorkers` (descarta respuestas fuera de orden); `services/` → `workerSearchService`, `userService.getPublicProfile`, `locationService.list`.
- **Navegación**: sin librería externa — rutas nuevas `"WorkerSearch"` y `"WorkerProfile"` en el `AppRoute` de `AppNavigator.tsx` (patrón de la app), y el pop-up decide si se entra y **con qué ubicación de referencia** (se guarda en estado del navigator y se pasa como prop `origin` a la búsqueda y al perfil). La pantalla de búsqueda **queda montada y oculta (`display: none`)** en las demás rutas desde que se abre por primera vez (se desmonta al cerrar sesión): abrir el perfil o volver a la Principal **no recarga el mapa** —la WebView del mapa sobrevive a la navegación— y se conservan la vista, el pin seleccionado y los resultados. "Agregar ubicación" abre la ruta `"Locations"` **con el formulario de alta abierto** (`openCreateOnMount`) y back a la Principal (reabre el pop-up), sin romper el flujo clásico Perfil → Mis Ubicaciones.

---

## 🏗️ Estructura del Proyecto

```
Frontend/src/
├── theme/tokens.ts                  # Tokens del sistema de diseño (modo oscuro)
├── types/
│   ├── onboarding.ts
│   ├── auth.ts                      # Interfaces de Registro y Autenticación
│   ├── location.ts                  # Tipos de ubicaciones guardadas
│   └── worker.ts                    # Tipos de búsqueda de trabajadores + catálogo de categorías
├── services/
│   ├── api.ts                       # Cliente API centralizado (backoff retry + timeout)
│   ├── authService.ts               # Llamadas a endpoints de Auth
│   ├── locationService.ts           # CRUD de ubicaciones guardadas
│   ├── workerSearchService.ts       # GET /workers/nearby (búsqueda en mapa)
│   ├── deviceLocation.ts            # Ubicación del dispositivo (expo-location)
│   └── geocodingService.ts          # Búsqueda/reverse-geocoding (Nominatim)
├── hooks/
│   ├── useOnboarding.ts
│   ├── useRegisterForm.ts           # Hook personalizado con validación y estados
│   ├── useLocations.ts              # Lista + CRUD de ubicaciones (orden por cercanía)
│   ├── useNearbyWorkers.ts          # Búsqueda cercana (refetch al mover mapa/filtros)
│   ├── useDeviceLocation.ts         # Permiso + posición del dispositivo
│   └── useLocationForm.ts           # Estado del formulario de ubicación
├── utils/
│   └── map.ts                       # Centro/zoom, tiles OSM, formato de distancia y zoom por radio
├── components/
│   ├── onboarding/                  # Subcomponentes de Onboarding
│   ├── register/
│   │   ├── RegisterFormInput.tsx    # Input con accesibilidad y toggle de contraseña
│   │   ├── PasswordRequirements.tsx # Checklist de complejidad de contraseña
│   │   ├── RegisterTermsRow.tsx     # Checkbox de términos y condiciones
│   │   └── TermsModal.tsx           # Modal de términos y condiciones
│   ├── worker/
│   │   ├── WorkerFilters.tsx        # Pills de categoría (sin filtro de distancia)
│   │   └── WorkerCard.tsx           # Tarjeta resumida con acciones
│   └── location/
│       ├── LeafletMap.tsx           # Mapa WebView + Leaflet + OSM (sin API key)
│       ├── LocationMapPicker.tsx    # Mapa interactivo (pin arrastrable, expandible)
│       ├── LocationsMapPreview.tsx  # Mapa de solo lectura con pins (expandible)
│       ├── AddressSearchInput.tsx   # Búsqueda de direcciones (debounced)
│       ├── LocationCard.tsx         # Ítem de la lista de ubicaciones
│       ├── LocationFormModal.tsx    # Modal de alta/edición
│       ├── ConfirmDialog.tsx        # Confirmación de acciones destructivas
│       └── SearchOriginModal.tsx    # Pop-up de elegir ubicación de la búsqueda
├── screens/
│   ├── OnboardingScreen.tsx
│   ├── RegisterScreen.tsx           # Contenedor de la pantalla de Registro (<150 líneas)
│   ├── LocationsScreen.tsx          # Gestión de ubicaciones guardadas
│   ├── WorkerSearchScreen.tsx       # Búsqueda de trabajadores en mapa/lista
│   └── WorkerProfileScreen.tsx      # Perfil público mínimo del trabajador
└── navigation/AppNavigator.tsx      # Ruteo principal (Onboarding, Register, OTP, Login, Perfil, Ubicaciones, Búsqueda)
```

---

## 🧪 Ejecutar Pruebas y Cobertura

```bash
# Ejecutar todas las pruebas unitarias e integración
npm test

# Ejecutar reporte de cobertura de código (mínimo 70% requerido)
npm run test:coverage
```
