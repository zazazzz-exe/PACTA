import { useEffect, useState } from 'react';
import { Upload, FileCheck2, X } from 'lucide-react';

// Capture the ID document as an image. Phase 4 uses a file input (with the
// mobile camera via `capture`); the live liveness/selfie scan arrives in Phase
// 5. The file stays in memory and is streamed to the provider, never uploaded to
// our own storage.
export function DocumentCapture({
  file,
  onFile,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (file) {
    return (
      <div className="rounded-control border border-hairline bg-paper p-3">
        <div className="flex items-center gap-3">
          {preview && (
            <img
              src={preview}
              alt=""
              aria-hidden
              className="h-14 w-14 rounded-control object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-accent-deep">
              <FileCheck2 size={15} aria-hidden /> Document ready
            </p>
            <p className="truncate text-[12px] text-fog">{file.name}</p>
          </div>
          <button
            type="button"
            onClick={() => onFile(null)}
            aria-label="Remove document"
            className="grid h-8 w-8 place-items-center rounded-control text-slate hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-control border border-dashed border-hairline-strong bg-mist p-6 text-center transition hover:border-accent">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-accent-tint text-accent">
        <Upload size={20} aria-hidden />
      </span>
      <span className="text-[14px] font-medium text-ink">Add a photo of your ID</span>
      <span className="text-[12px] text-fog">Passport, national ID, or driver's license</span>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
