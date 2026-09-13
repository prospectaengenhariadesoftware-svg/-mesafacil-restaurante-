'use client';

import { useEffect, useId, useRef, useState } from 'react';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function CreateModal({
  triggerLabel,
  eyebrow,
  title,
  description,
  children,
}: Readonly<{
  triggerLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}>) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  function closeModal() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    focusables[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== 'Tab') return;
      const currentFocusables = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
        .filter((element) => element.offsetParent !== null || element === document.activeElement);
      if (currentFocusables.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = currentFocusables[0];
      const last = currentFocusables[currentFocusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-12 items-center justify-center rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-red-100 transition hover:bg-red-700"
      >
        {triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] grid place-items-end bg-stone-950/40 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
          <button type="button" aria-label="Fechar modal" tabIndex={-1} className="absolute inset-0 cursor-default" onClick={closeModal} />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] border border-stone-200 bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-[2rem] sm:p-6"
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4">
              <div>
                <p className="text-sm font-black text-red-600">{eyebrow}</p>
                <h2 id={titleId} className="mt-1 text-2xl font-black tracking-tight">{title}</h2>
                <p id={descriptionId} className="mt-2 text-sm leading-6 text-stone-500">{description}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-stone-200 bg-stone-50 text-xl font-black text-stone-500 hover:bg-red-50 hover:text-red-600"
                aria-label="Fechar cadastro"
              >
                ×
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
