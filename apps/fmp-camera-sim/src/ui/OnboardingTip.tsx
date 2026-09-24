import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "fmpCameraSim.onboarding.v1";

const STEPS: Array<{ title: string; body: string }> = [
  {
    title: "Move the camera",
    body: "Drag the joystick, or hold the arrow keys / W A S D. Shift is fast; Alt is fine. Letting go stops the move.",
  },
  {
    title: "Zoom",
    body: "Hold T (tele) or W (wide) on the rocker — a quick tap does nothing. E / Q and + / − work the same way.",
  },
  {
    title: "Store a preset",
    body: "Press Store, then a number 1–9 (or Shift+number). Right-click or long-press a filled slot to rename or clear it. Home is not the FMP safe-wide show preset.",
  },
];

export function shouldShowOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "done";
  } catch {
    return true;
  }
}

export function markOnboardingDone(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "done");
  } catch {
    /* private mode — tip can return next visit */
  }
}

interface Props {
  open: boolean;
  onClose(): void;
}

/** Three-step first-run tip for Operate. Dismissed state lives in localStorage. */
export function OnboardingTip({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setStep(0);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const finish = () => {
    markOnboardingDone();
    onClose();
  };

  const last = step >= STEPS.length - 1;
  const current = STEPS[step]!;

  return (
    <dialog
      ref={ref}
      className="help-dialog onboarding-dialog"
      aria-labelledby="onboarding-title"
      onClose={finish}
      onCancel={finish}
    >
      <div className="help-head">
        <h2 id="onboarding-title">Quick start · {step + 1} of {STEPS.length}</h2>
        <button type="button" className="tool-button" onClick={finish}>
          Skip
        </button>
      </div>
      <h3>{current.title}</h3>
      <p>{current.body}</p>
      <p className="onboarding-scope">
        Framing, zoom, and presets only — not SuperJoy faceplate or focus. Nothing connects to a live camera.
      </p>
      <div className="onboarding-actions">
        {step > 0 ? (
          <button type="button" className="secondary-button" onClick={() => setStep((s) => s - 1)}>
            Back
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="primary-button" autoFocus onClick={() => (last ? finish() : setStep((s) => s + 1))}>
          {last ? "Start practising" : "Next"}
        </button>
      </div>
    </dialog>
  );
}
