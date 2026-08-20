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

---

## 🏗️ Estructura del Proyecto

```
Frontend/src/
├── theme/tokens.ts                  # Tokens del sistema de diseño (modo oscuro)
├── types/
│   ├── onboarding.ts
│   └── auth.ts                      # Interfaces de Registro y Autenticación
├── services/
│   ├── api.ts                       # Cliente API centralizado (backoff retry + timeout)
│   └── authService.ts               # Llamadas a endpoints de Auth
├── hooks/
│   ├── useOnboarding.ts
│   └── useRegisterForm.ts           # Hook personalizado con validación y estados
├── components/
│   ├── onboarding/                  # Subcomponentes de Onboarding
│   └── register/
│       ├── RegisterFormInput.tsx    # Input con accesibilidad y toggle de contraseña
│       ├── PasswordRequirements.tsx # Checklist de complejidad de contraseña
│       ├── RegisterTermsRow.tsx     # Checkbox de términos y condiciones
│       └── TermsModal.tsx           # Modal de términos y condiciones
├── screens/
│   ├── OnboardingScreen.tsx
│   └── RegisterScreen.tsx           # Contenedor de la pantalla de Registro (<150 líneas)
└── navigation/AppNavigator.tsx      # Ruteo principal (Onboarding, Register, OTP, Login)
```

---

## 🧪 Ejecutar Pruebas y Cobertura

```bash
# Ejecutar todas las pruebas unitarias e integración
npm test

# Ejecutar reporte de cobertura de código (mínimo 70% requerido)
npm run test:coverage
```