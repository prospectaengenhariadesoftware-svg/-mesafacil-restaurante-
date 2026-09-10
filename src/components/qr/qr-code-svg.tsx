import QRCode from 'qrcode';

export async function QrCodeImage({ value, label }: Readonly<{ value: string; label: string }>) {
  const image = await QRCode.toDataURL(value, {
    margin: 2,
    width: 180,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  return (
    <figure className="rounded-2xl border border-slate-800 bg-white p-3 text-center text-slate-950">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={label} width={180} height={180} className="mx-auto" />
      <figcaption className="mt-2 text-xs font-semibold">{label}</figcaption>
    </figure>
  );
}
