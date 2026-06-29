interface LocationMapProps {
  latitude: string | number | null | undefined;
  longitude: string | number | null | undefined;
  label?: string;
  height?: number;
  accuracy?: number | null;
}

export function LocationMap({ latitude, longitude, label, height = 180, accuracy }: LocationMapProps) {
  if (!latitude || !longitude) return null;

  const lat = Number(latitude);
  const lon = Number(longitude);
  if (isNaN(lat) || isNaN(lon)) return null;

  const delta = 0.008;
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
  const mapsLink = `https://www.google.com/maps?q=${lat},${lon}`;

  return (
    <div className="rounded-md overflow-hidden border border-border">
      {label && (
        <div className="px-2 py-1 bg-muted text-xs text-muted-foreground font-medium flex items-center justify-between">
          <span>{label}</span>
          {accuracy && <span className="text-[10px] text-muted-foreground">±{Math.round(accuracy)}m</span>}
        </div>
      )}
      <iframe
        src={src}
        width="100%"
        height={height}
        style={{ border: 0, display: "block" }}
        loading="lazy"
        title={label ?? "Location map"}
        allowFullScreen={false}
        referrerPolicy="no-referrer"
      />
      <div className="px-2 py-1.5 bg-muted/50 text-[11px] text-muted-foreground flex items-center justify-between">
        <span className="font-mono">{lat.toFixed(6)}, {lon.toFixed(6)}</span>
        <a
          href={mapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline ml-2"
        >
          Open in Maps ↗
        </a>
      </div>
    </div>
  );
}
