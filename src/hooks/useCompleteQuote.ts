import { useState, useCallback } from 'react';
import { z, ZodError } from 'zod';
import { quoteService } from '../services/quoteService';
import { QuoteData } from '../types/chat';

/**
 * Esquema de validación para los datos de cotización del trabajador:
 * - Fecha: debe ser una fecha futura (ISO YYYY-MM-DD).
 * - Hora: formato HH:mm (24 horas).
 * - Precio: número positivo.
 */
const quoteFormSchema = z.object({
  proposed_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
    .refine(
      (date) => {
        const today = new Date();
        const todayStr = [
          today.getFullYear(),
          String(today.getMonth() + 1).padStart(2, '0'),
          String(today.getDate()).padStart(2, '0'),
        ].join('-');
        return date >= todayStr;
      },
      { message: 'La fecha debe ser hoy o una fecha futura' }
    ),
  proposed_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener formato HH:mm'),
  proposed_price: z
    .number({ message: 'El precio debe ser un número' })
    .positive('El precio debe ser un valor positivo')
    .max(99999999.99, 'El precio es demasiado alto'),
});

export interface QuoteFormData {
  proposed_date: string;
  proposed_time: string;
  proposed_price: number;
}

export interface UseCompleteQuoteReturn {
  /** Datos validados del formulario (si pasaron la validación). */
  formData: QuoteFormData | null;
  /** Errores de validación por campo. */
  formErrors: Record<string, string>;
  /** Si hay un error de validación pendiente. */
  hasFormError: boolean;
  /** Si se está creando la cotización. */
  isCreating: boolean;
  /** Error de API al crear la cotización. */
  apiError: string | null;
  /** Valida los datos del formulario. Devuelve true si son válidos. */
  validateForm: (data: QuoteFormData) => boolean;
  /** Crea la cotización vía API a partir de una solicitud. Devuelve la cotización creada o null. */
  createQuoteFromRequest: (
    quoteRequestId: string,
    data: QuoteFormData
  ) => Promise<QuoteData | null>;
  /** Limpia errores. */
  reset: () => void;
}

/**
 * Hook para el flujo de "Completar Cotización" del trabajador.
 *
 * Gestiona:
 * 1. Validación de fecha, hora y precio con Zod.
 * 2. Llamada a POST /orders/:order_id/quotes para crear la cotización.
 * 3. Estados de carga y error de API.
 *
 * El envío del mensaje al chat (burbuja "Cotización completada" o rechazo)
 * se maneja desde el componente que usa este hook, usando useConversation/useChat.
 */
export const useCompleteQuote = (): UseCompleteQuoteReturn => {
  const [formData, setFormData] = useState<QuoteFormData | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validateForm = useCallback((data: QuoteFormData): boolean => {
    try {
      quoteFormSchema.parse(data);
      setFormErrors({});
      setFormData(data);
      return true;
    } catch (err) {
      if (err instanceof ZodError) {
        const errors: Record<string, string> = {};
        err.issues.forEach((e) => {
          const field = e.path.join('.');
          errors[field] = e.message;
        });
        setFormErrors(errors);
        setFormData(null);
      }
      return false;
    }
  }, []);

  const createQuoteFromRequest = useCallback(
    async (quoteRequestId: string, data: QuoteFormData): Promise<QuoteData | null> => {
      setIsCreating(true);
      setApiError(null);

      try {
        const quote = await quoteService.createQuoteFromRequest(quoteRequestId, {
          proposed_price: data.proposed_price,
          proposed_date: data.proposed_date,
          proposed_time: data.proposed_time,
        });
        setFormData(data);
        return quote;
      } catch (err: unknown) {
        if (err instanceof Error) {
          setApiError(err.message);
        } else {
          setApiError('Error al crear la cotización');
        }
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setFormData(null);
    setFormErrors({});
    setApiError(null);
  }, []);

  return {
    formData,
    formErrors,
    hasFormError: Object.keys(formErrors).length > 0,
    isCreating,
    apiError,
    validateForm,
    createQuoteFromRequest,
    reset,
  };
};

export default useCompleteQuote;
