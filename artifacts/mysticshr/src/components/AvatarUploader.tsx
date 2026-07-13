import { useRef, useState } from "react";
import { requestUploadUrl } from "@workspace/api-client-react";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

/**
 * Single-photo uploader for employee avatars. Uses the same presigned
 * object-storage upload flow as AttachmentUploader, but is scoped to one
 * image and calls `onUploaded` with the resulting objectPath so callers can
 * PATCH it onto the employee record (HR) or their own profile (self-service).
 */
export function AvatarUploader({
  previewUrl,
  onUploaded,
  disabled,
}: {
  previewUrl?: string | null;
  onUploaded: (objectPath: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Local object URL from the just-selected file, shown immediately instead
  // of waiting on the caller to save + refetch the server-side avatar.
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) { setError(`"${file.name}" exceeds 5 MB`); return; }
    if (!ALLOWED_TYPES.has(file.type)) { setError("Please choose a PNG, JPG, or WebP image"); return; }
    setBusy(true);
    const localUrl = URL.createObjectURL(file);
    try {
      const { uploadURL, objectPath } = await requestUploadUrl({
        name: file.name,
        size: file.size,
        contentType: file.type,
      });
      const putRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);
      setLocalPreview(localUrl);
      onUploaded(objectPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      URL.revokeObjectURL(localUrl);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const shownPreview = localPreview ?? previewUrl;

  return (
    <div className="flex items-center gap-3">
      <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
        {shownPreview
          ? <img src={shownPreview} alt="Photo" className="w-full h-full object-cover" />
          : <span className="text-[10px] text-slate-400">No photo</span>}
      </div>
      <div>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className="text-xs px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          {busy ? "Uploading…" : previewUrl ? "Change photo" : "Upload photo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={e => handleFile(e.target.files)}
        />
        {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
        <p className="text-[10px] text-slate-500 mt-1">PNG, JPG, or WebP. Max 5 MB.</p>
      </div>
    </div>
  );
}
