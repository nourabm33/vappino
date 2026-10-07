export interface CheckoutValues {
  fullName: string;
  phone: string;
  notes: string;
}

export type CheckoutErrors = Partial<Record<keyof CheckoutValues, string>>;

export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 80;
export const NOTES_MAX_LENGTH = 500;

/** Strips spaces, dots, dashes and parentheses used for readability. */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s.\-()]/g, "");
}

/**
 * Accepts Tunisian numbers (8 digits, optional +216 / 00216 prefix)
 * and generic international numbers (+ followed by 8–15 digits).
 */
export function isValidPhone(phone: string): boolean {
  const p = normalizePhone(phone);
  if (/^(?:\+216|00216)?[2-9]\d{7}$/.test(p)) return true;
  return /^\+[1-9]\d{7,14}$/.test(p);
}

export function validateCheckout(values: CheckoutValues): CheckoutErrors {
  const errors: CheckoutErrors = {};
  const name = values.fullName.trim();

  if (!name) {
    errors.fullName = "Veuillez indiquer votre nom complet.";
  } else if (name.length < NAME_MIN_LENGTH) {
    errors.fullName = `Le nom doit contenir au moins ${NAME_MIN_LENGTH} caractères.`;
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.fullName = `Le nom ne peut pas dépasser ${NAME_MAX_LENGTH} caractères.`;
  } else if (!/^[\p{L}][\p{L}\s'.-]*$/u.test(name)) {
    errors.fullName = "Le nom ne doit contenir que des lettres.";
  }

  if (!values.phone.trim()) {
    errors.phone = "Veuillez indiquer votre numéro de téléphone.";
  } else if (!isValidPhone(values.phone)) {
    errors.phone = "Numéro invalide. Exemple : 20 123 456 ou +216 20 123 456.";
  }

  if (values.notes.length > NOTES_MAX_LENGTH) {
    errors.notes = `Les remarques ne peuvent pas dépasser ${NOTES_MAX_LENGTH} caractères.`;
  }

  return errors;
}
