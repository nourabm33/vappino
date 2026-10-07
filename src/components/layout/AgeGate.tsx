"use client";

import { useEffect, useRef, useState } from "react";
import { SITE } from "@/lib/site";
import { Logo } from "./Logo";
import styles from "./AgeGate.module.css";

const STORAGE_KEY = "vappino.ageConfirmed.v1";

export function AgeGate() {
  const [state, setState] = useState<"unknown" | "ask" | "refused" | "ok">("unknown");
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let confirmed = false;
    try {
      confirmed = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      /* storage unavailable */
    }
    setState(confirmed ? "ok" : "ask");
  }, []);

  useEffect(() => {
    if (state !== "ask" && state !== "refused") return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [state]);

  if (state === "unknown" || state === "ok") return null;

  const confirm = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* storage unavailable */
    }
    setState("ok");
  };

  return (
    <div className={styles.overlay}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-gate-title"
        aria-describedby="age-gate-text"
      >
        <Logo height={96} linked={false} />
        <h2 id="age-gate-title" className={styles.title}>
          Avez-vous {SITE.minimumAge} ans ou plus&nbsp;?
        </h2>
        <p id="age-gate-text" className={styles.text}>
          Ce site propose des produits contenant de la nicotine, réservés aux personnes majeures.
        </p>
        {state === "refused" && (
          <p className={styles.refused} role="alert">
            Désolé, l&apos;accès à ce site est réservé aux personnes majeures.
          </p>
        )}
        <div className={styles.actions}>
          <button ref={confirmRef} type="button" className="btn btn-primary btn-block" onClick={confirm}>
            Oui, j&apos;ai {SITE.minimumAge} ans ou plus
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setState("refused")}>
            Non
          </button>
        </div>
      </div>
    </div>
  );
}
