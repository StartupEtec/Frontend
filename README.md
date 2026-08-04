# ProyectoIntegrador-Frontends

Aplicación Mobile (React Native + Expo) para la plataforma on-demand de servicios.

## 📱 Funcionalidad Implementada: Issue #7 - Pantalla de Onboarding

### Características
- **Carrusel de 4 Pantallas**:
  1. Presentación general de la plataforma.
  2. Presentación del Rol Cliente (búsqueda, presupuestos, Escrow).
  3. Presentación del Rol Trabajador/Proveedor (monetización de servicios, flexibilidad).
  4. Pantalla de Bienvenida con CTAs ("Registrarse" / "Iniciar Sesión").
- **Persistencia Local**: Uso de `@react-native-async-storage/async-storage` para guardar la flag `@startup_app/onboarding_completed`.
- **Lógica Condicional de Navegación**: Si la flag `onboarding_completed === 'true'`, se saltea automáticamente a la pantalla de Auth/Login.
- **Acciones**: Botón "Omitir" (salta y guarda flag), botones "Anterior" y "Siguiente", swipe táctil horizontal.
- **Accesibilidad**: Roles y etiquetas de accesibilidad WCAG AA.

### Estructura del Módulo
```
src/
├── theme/tokens.ts                  # Tokens del sistema de diseño
├── types/onboarding.ts              # Interfaces TypeScript
├── i18n/onboardingContent.ts        # Contenidos y textos en español
├── hooks/useOnboarding.ts           # Hook personalizado con AsyncStorage
├── components/onboarding/
│   ├── OnboardingSlide.tsx          # Componente de slide con gráficos responsivos
│   ├── PaginationDots.tsx           # Indicador de puntos activo/inactivo
│   ├── OnboardingHeader.tsx         # Barra superior con botón Omitir
│   ├── OnboardingFooter.tsx         # Barra inferior con navegación y CTAs
│   └── OnboardingScreen.stories.tsx # Documentación Storybook
├── screens/OnboardingScreen.tsx     # Contenedor principal de la pantalla
└── navigation/AppNavigator.tsx      # Guard de navegación inicial
```

### Ejecutar Pruebas
```bash
npm test
```