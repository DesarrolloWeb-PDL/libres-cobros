import { ImageResponse } from 'next/og';

// Default social share image — per node_modules/next/dist/docs
// 01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md:
// colocate opengraph-image.tsx at the app root; export alt/size/contentType
// and default-export a function returning ImageResponse. No custom fonts:
// rely on the built-in default to avoid any network font fetch at build time.

export const alt = 'Libres Cobros — cobrá tus cuotas sin comisiones ni letra chica';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#7c3aed',
          color: '#ffffff',
        }}
      >
        {/* Subtle cube motif — four rounded squares echoing the site logo mark */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: '#ffffff',
              opacity: 1,
            }}
          />
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: '#ffffff',
              opacity: 0.7,
            }}
          />
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: '#ffffff',
              opacity: 0.5,
            }}
          />
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: '#ffffff',
              opacity: 0.3,
            }}
          />
        </div>

        <div style={{ fontSize: 92, fontWeight: 700, letterSpacing: -2 }}>
          Libres Cobros
        </div>
        <div
          style={{
            fontSize: 36,
            marginTop: 24,
            opacity: 0.9,
            textAlign: 'center',
            maxWidth: 900,
          }}
        >
          Cobrá tus cuotas sin comisiones ni letra chica.
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
