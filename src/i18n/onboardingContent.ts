import { OnboardingSlideData } from "../types/onboarding";
import { colors } from "../theme/tokens";

export const ASYNC_STORAGE_ONBOARDING_KEY = "@startup_app/onboarding_completed";

export const onboardingSlidesEs: OnboardingSlideData[] = [
  {
    id: "slide_1_platform",
    badgeText: "Plataforma On-Demand",
    badgeColor: colors.primary,
    title: "Conecta con Servicios al Instante",
    highlightText: "al Instante",
    description:
      "La solución digital que une a clientes con profesionales independientes calificados de forma rápida, transparente y segura.",
    iconName: "briefcase",
    svgPlaceholderType: "platform",
  },
  {
    id: "slide_2_client",
    badgeText: "Modo Cliente",
    badgeColor: colors.clientAccent,
    title: "Encuentra al Profesional Ideal",
    highlightText: "Profesional Ideal",
    description:
      "Publica tus requerimientos, compara presupuestos transparentes y realiza pagos protegidos con nuestro sistema Escrow.",
    iconName: "user-check",
    svgPlaceholderType: "client",
  },
  {
    id: "slide_3_worker",
    badgeText: "Modo Trabajador",
    badgeColor: colors.workerAccent,
    title: "Ofrece tus Servicios y Monetiza",
    highlightText: "Monetiza",
    description:
      "Monetiza tus habilidades con total libertad de horarios. Recibe pagos garantizados directo a tu cuenta al completar cada trabajo.",
    iconName: "award",
    svgPlaceholderType: "worker",
  },
  {
    id: "slide_4_welcome",
    badgeText: "Únete Hoy",
    badgeColor: colors.primaryLight,
    title: "¿Listo para Comenzar la Experiencia?",
    highlightText: "Experiencia",
    description:
      "Alterna dinámicamente entre Cliente y Proveedor con una sola cuenta. Registrate o inicia sesión ahora.",
    iconName: "rocket",
    svgPlaceholderType: "welcome",
  },
];

export const onboardingUIStrings = {
  skip: "Omitir",
  prev: "Anterior",
  next: "Siguiente",
  register: "Registrarse",
  login: "Iniciar Sesión",
  accessibility: {
    skipHint: "Omitir el tutorial e ir a inicio de sesión",
    nextHint: "Avanzar a la siguiente pantalla del onboarding",
    prevHint: "Regresar a la pantalla anterior del onboarding",
    registerHint: "Ir al formulario de registro de usuario",
    loginHint: "Ir a la pantalla de inicio de sesión",
  },
};
