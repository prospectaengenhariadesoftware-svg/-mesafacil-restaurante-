'use client';

import { useEffect, useState } from 'react';

type Props = Readonly<{
  currentLogoUrl?: string | null;
  restaurantName: string;
  disabled?: boolean;
}>;

function initialLetter(name: string): string {
  const trimmed = name.trim();
  return (trimmed[0] ?? 'M').toUpperCase();
}

export function RestaurantLogoInput({ currentLogoUrl, restaurantName, disabled = false }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl ?? null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl border border-stone-200 bg-gradient-to-br from-red-50 to-stone-100 text-3xl font-bold text-red-700">
          {previewUrl && !removeLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={`Logo de ${restaurantName}`} className="h-full w-full object-cover" />
          ) : (
            <span aria-label={`Inicial de ${restaurantName}`}>{initialLetter(restaurantName)}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-stone-900">Logo do restaurante</p>
          <p className="mt-1 text-xs leading-5 text-stone-500">PNG, JPG ou WEBP até 1 MB. A imagem fica isolada no storage do tenant.</p>
          <input
            name="logoFile"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (objectUrl) URL.revokeObjectURL(objectUrl);
              if (!file) {
                setObjectUrl(null);
                setPreviewUrl(currentLogoUrl ?? null);
                return;
              }
              const nextObjectUrl = URL.createObjectURL(file);
              setObjectUrl(nextObjectUrl);
              setPreviewUrl(nextObjectUrl);
              setRemoveLogo(false);
            }}
            className="mt-3 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-950 file:mr-4 file:rounded-full file:border-0 file:bg-red-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-red-700 disabled:cursor-not-allowed"
          />

          {currentLogoUrl ? (
            <label className="mt-3 flex items-start gap-3 text-sm text-stone-700">
              <input
                type="checkbox"
                name="removeLogo"
                value="true"
                disabled={disabled}
                checked={removeLogo}
                onChange={(event) => setRemoveLogo(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-red-600"
              />
              <span>Remover logo atual e voltar para avatar com inicial.</span>
            </label>
          ) : null}
        </div>
      </div>
    </div>
  );
}
