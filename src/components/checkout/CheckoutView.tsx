"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { EmptyCart } from "@/components/cart/EmptyCart";
import { OrderSummary } from "@/components/cart/OrderSummary";
import { Logo } from "@/components/layout/Logo";
import { AlertIcon, ArrowLeftIcon } from "@/components/ui/Icons";
import {
  OrderSubmissionError,
  buildOrderRequest,
  clearLastOrderError,
  createIdempotencyKey,
  saveLastOrder,
  submitOrder,
  type OrderRequest,
} from "@/lib/orders";
import { buildWhatsAppOrderUrl } from "@/lib/whatsapp";
import {
  ADDRESS_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  validateCheckout,
  type CheckoutErrors,
  type CheckoutValues,
} from "@/lib/validation";
import styles from "./CheckoutView.module.css";

const DRAFT_KEY = "vappino.checkoutDraft.v1";
const ATTEMPT_KEY = "vappino.checkoutAttempt.v1";
const FIELD_ORDER: (keyof CheckoutValues)[] = ["fullName", "phone", "address", "notes"];
const EMPTY: CheckoutValues = { fullName: "", phone: "", address: "", notes: "" };

/** Reuses the same idempotency key when the exact same order is resubmitted (double click, retry after error). */
function attemptKey(request: OrderRequest): string {
  const signature = JSON.stringify(request);
  try {
    const saved = JSON.parse(sessionStorage.getItem(ATTEMPT_KEY) ?? "null") as { key?: string; signature?: string } | null;
    if (saved?.key && saved.signature === signature) return saved.key;
  } catch {
    /* ignore */
  }
  const key = createIdempotencyKey();
  try {
    sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify({ key, signature }));
  } catch {
    /* ignore */
  }
  return key;
}

export function CheckoutView() {
  const router = useRouter();
  const { ready, items, lines, itemCount, subtotal, clearCart } = useCart();
  const [values, setValues] = useState<CheckoutValues>(EMPTY);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "redirecting">("idle");
  const formRef = useRef<HTMLFormElement>(null);
  const inFlight = useRef(false);

  // Restore a draft (e.g. when returning from /order-error).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) setValues({ ...EMPTY, ...(JSON.parse(raw) as Partial<CheckoutValues>) });
    } catch {
      /* ignore */
    }
  }, []);

  const update = (field: keyof CheckoutValues, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    if (submitted) setErrors(validateCheckout(next));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status !== "idle" || inFlight.current) return;
    setSubmitted(true);
    const found = validateCheckout(values);
    setErrors(found);
    const firstInvalid = FIELD_ORDER.find((f) => found[f]);
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    inFlight.current = true;
    setStatus("submitting");
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values));
    } catch {
      /* ignore */
    }

    const request = buildOrderRequest(values, items);
    // The order reaches the shop through the customer's WhatsApp message, so a backend
    // failure only costs the reference: it never blocks the WhatsApp step.
    let reference: string | null = null;
    try {
      reference = (await submitOrder(request, attemptKey(request))).reference;
    } catch (error) {
      if (error instanceof OrderSubmissionError) reference = error.failure.orderRef;
    }

    const whatsappUrl = buildWhatsAppOrderUrl({
      reference,
      fullName: request.customerName,
      phone: values.phone.trim(),
      address: request.customerAddress,
      notes: request.customerNotes,
      lines,
      total: subtotal,
    });
    saveLastOrder({ reference, total: subtotal, currency: "TND", createdAt: new Date().toISOString(), whatsappUrl });
    clearLastOrderError();
    try {
      sessionStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem(ATTEMPT_KEY);
    } catch {
      /* ignore */
    }
    setStatus("redirecting");
    clearCart();
    router.push("/order-success");
  };

  if (!ready) return null;
  if (lines.length === 0 && status === "idle") {
    return <EmptyCart title="Aucun article à commander" />;
  }

  const busy = status !== "idle";

  return (
    <div className={styles.layout}>
      <form ref={formRef} className={styles.form} onSubmit={onSubmit} noValidate aria-busy={busy}>
        <div className={styles.formHead}>
          <h2 className={styles.formTitle}>Vos coordonnées</h2>
          <Logo height={44} linked={false} />
        </div>

        <Field
          id="fullName"
          label="Nom complet"
          error={errors.fullName}
          input={
            <input
              id="fullName"
              name="fullName"
              className={styles.input}
              type="text"
              autoComplete="name"
              placeholder="Ex. Ahmed Ben Ali"
              maxLength={NAME_MAX_LENGTH}
              value={values.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? "fullName-error" : undefined}
              required
              disabled={busy}
            />
          }
        />

        <Field
          id="phone"
          label="Numéro de téléphone"
          error={errors.phone}
          hint="Nous vous répondrons sur WhatsApp ou par téléphone pour confirmer la commande."
          input={
            <input
              id="phone"
              name="phone"
              className={styles.input}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="Ex. 20 123 456"
              maxLength={20}
              value={values.phone}
              onChange={(e) => update("phone", e.target.value)}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
              required
              disabled={busy}
            />
          }
        />

        <Field
          id="address"
          label="Adresse de livraison"
          error={errors.address}
          input={
            <input
              id="address"
              name="address"
              className={styles.input}
              type="text"
              autoComplete="street-address"
              placeholder="Ex. 12 rue de Marseille, Tunis"
              maxLength={ADDRESS_MAX_LENGTH}
              value={values.address}
              onChange={(e) => update("address", e.target.value)}
              aria-invalid={Boolean(errors.address)}
              aria-describedby={errors.address ? "address-error" : undefined}
              required
              disabled={busy}
            />
          }
        />

        <Field
          id="notes"
          label="Remarques"
          optional
          error={errors.notes}
          hint={`${values.notes.length}/${NOTES_MAX_LENGTH}`}
          input={
            <textarea
              id="notes"
              name="notes"
              className={styles.input}
              placeholder="Précisions sur votre commande (facultatif)"
              maxLength={NOTES_MAX_LENGTH}
              value={values.notes}
              onChange={(e) => update("notes", e.target.value)}
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? "notes-error" : "notes-hint"}
              disabled={busy}
            />
          }
        />

        <button type="submit" className={`btn btn-primary btn-lg btn-block ${styles.submit}`} disabled={busy}>
          {busy ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              Préparation de votre commande…
            </>
          ) : (
            "Envoyer la commande"
          )}
        </button>
        <p className={styles.reassure}>
          WhatsApp s&apos;ouvre avec votre commande pré-remplie : il suffit d&apos;appuyer sur Envoyer. Aucun paiement en
          ligne n&apos;est demandé.
        </p>
        <Link href="/cart" className="btn btn-ghost btn-sm">
          <ArrowLeftIcon size={16} />
          Retour au panier
        </Link>
      </form>

      <div className={styles.aside}>
        <OrderSummary lines={lines} itemCount={itemCount} subtotal={subtotal} showItems />
      </div>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  input: React.ReactNode;
  error?: string;
  hint?: string;
  optional?: boolean;
}

function Field({ id, label, input, error, hint, optional }: FieldProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label} {optional ? <span className={styles.optional}>(facultatif)</span> : <span aria-hidden="true">*</span>}
      </label>
      {input}
      {error ? (
        <p id={`${id}-error`} className={styles.error} role="alert">
          <AlertIcon size={16} />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className={styles.hintRow}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}
