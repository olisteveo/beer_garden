import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (el: HTMLElement, config: any) => void;
        };
      };
    };
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface GoogleButtonProps {
  /** Text shown on the button: "signin_with" | "signup_with" */
  text?: "signin_with" | "signup_with";
  onError?: (msg: string) => void;
}

/**
 * Google Identity Services sign-in button.
 * Requires the GIS script in index.html and VITE_GOOGLE_CLIENT_ID env var.
 */
export function GoogleButton({ text = "signin_with", onError }: GoogleButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { loginWithGoogle } = useAuth();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId || !ref.current) return;

    // Wait for GIS script to load
    function tryInit() {
      const g = window.google;
      if (!g?.accounts?.id || !ref.current) {
        setTimeout(tryInit, 200);
        return;
      }

      g.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential?: string }) => {
          if (!response.credential) {
            onError?.("Google sign-in failed — no credential returned.");
            return;
          }
          try {
            await loginWithGoogle(response.credential);
          } catch (err) {
            onError?.(err instanceof Error ? err.message : "Google sign-in failed");
          }
        },
      });

      g.accounts.id.renderButton(ref.current, {
        theme: "filled_black",
        size: "large",
        width: 320,
        text,
        shape: "pill",
      });
    }

    tryInit();
  }, [clientId, loginWithGoogle, onError, text]);

  if (!clientId) return null;

  return <div ref={ref} className="flex justify-center" />;
}
