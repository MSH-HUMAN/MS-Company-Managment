"use client";

import { useRef, useState, useCallback } from "react";
import {
  UploadCloud, FileText, Eye, Download, Trash2, X,
  CheckCircle2, AlertCircle, ImageIcon, FileArchive,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Document } from "@/lib/types";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fileExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function getFileIcon(name: string) {
  const ext = fileExt(name);
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return ImageIcon;
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return FileArchive;
  return FileText;
}

function getIconStyle(name: string): string {
  const ext = fileExt(name);
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext))
    return "text-pink-600 bg-pink-50 border-pink-100";
  if (["pdf"].includes(ext))
    return "text-rose-600 bg-rose-50 border-rose-100";
  if (["doc", "docx"].includes(ext))
    return "text-blue-600 bg-blue-50 border-blue-100";
  if (["xls", "xlsx", "csv"].includes(ext))
    return "text-emerald-600 bg-emerald-50 border-emerald-100";
  if (["ppt", "pptx"].includes(ext))
    return "text-orange-600 bg-orange-50 border-orange-100";
  if (["zip", "rar"].includes(ext))
    return "text-amber-600 bg-amber-50 border-amber-100";
  return "text-slate-500 bg-slate-100 border-slate-200";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Helper to convert blob to data URL
function getBlobBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── types ────────────────────────────────────────────────────────────────────

interface PendingItem {
  file: File;
  dataUrl: string | null;
  customName: string;   // editable name (no extension)
  loading: boolean;
}

interface DocumentUploaderProps {
  documents: Document[];
  uploadedBy: string;
  onAdd: (doc: Document) => void;
  onDelete?: (docId: string) => void;
  canUpload?: boolean;
  canDelete?: boolean;
  canDownload?: boolean;
  label?: string;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function DocumentUploader({
  documents,
  uploadedBy,
  onAdd,
  onDelete,
  canUpload = true,
  canDelete = false,
  canDownload = true,
  label = "Documents",
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [stagingOpen, setStagingOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [uploadingAll, setUploadingAll] = useState(false);
  
  // Progress states
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);

  // ── read files into pending list ───────────────────────────────────────────
  const readFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;

    // Check size limit: none, let chunked handle large files, but only load thumbnails for images < 5MB
    const readers: Promise<PendingItem>[] = arr.map(
      (file) =>
        new Promise((resolve) => {
          const isImage = file.type.startsWith("image/");
          if (isImage && file.size < 5 * 1024 * 1024) {
            const reader = new FileReader();
            reader.onload = (e) =>
              resolve({
                file,
                dataUrl: e.target?.result as string | null,
                customName: file.name.replace(/\.[^/.]+$/, ""),
                loading: false,
              });
            reader.onerror = () =>
              resolve({ file, dataUrl: null, customName: file.name.replace(/\.[^/.]+$/, ""), loading: false });
            reader.readAsDataURL(file);
          } else {
            resolve({
              file,
              dataUrl: null,
              customName: file.name.replace(/\.[^/.]+$/, ""),
              loading: false,
            });
          }
        })
    );

    Promise.all(readers).then((items) => {
      setPending((prev) => [...prev, ...items]);
      setStagingOpen(true);
    });
  }, []);

  // ── drop ───────────────────────────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canUpload) return;
    readFiles(e.dataTransfer.files);
  };

  // ── input change ──────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) readFiles(e.target.files);
    e.target.value = "";
  };

  // ── update a single pending item's name ───────────────────────────────────
  const updateName = (idx: number, value: string) => {
    setPending((prev) => prev.map((item, i) => (i === idx ? { ...item, customName: value } : item)));
  };

  // ── remove a pending item ─────────────────────────────────────────────────
  const removePending = (idx: number) => {
    setPending((prev) => prev.filter((_, i) => i !== idx));
    if (pending.length === 1) setStagingOpen(false);
  };

  // ── upload all pending ────────────────────────────────────────────────────
  const confirmUploadAll = async () => {
    const nameless = pending.findIndex((p) => !p.customName.trim());
    if (nameless !== -1) {
      toast.error(`Please enter a name for file #${nameless + 1}.`);
      return;
    }

    setUploadingAll(true);
    setCurrentUploadIndex(0);
    setCurrentProgress(0);

    try {
      for (let index = 0; index < pending.length; index++) {
        setCurrentUploadIndex(index);
        setCurrentProgress(0);

        const item = pending[index];
        const file = item.file;
        const uploadId = `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const chunkSize = 1024 * 1024; // 1MB chunks
        const totalChunks = Math.ceil(file.size / chunkSize);

        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const blobSlice = file.slice(start, end);

          const chunkDataUrl = await getBlobBase64(blobSlice);
          const rawBase64 = i > 0 && chunkDataUrl.includes("base64,")
            ? chunkDataUrl.split("base64,")[1]
            : chunkDataUrl;

          // Upload chunk
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/upload", true);
            xhr.setRequestHeader("Content-Type", "application/json");

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`Failed to upload chunk ${i} of ${file.name}`));
              }
            };
            xhr.onerror = () => reject(new Error("Network connection error"));
            xhr.send(
              JSON.stringify({
                action: "chunk",
                uploadId,
                chunkIndex: i,
                data: rawBase64,
              })
            );
          });

          // Update progress
          const pct = Math.round(((i + 1) / totalChunks) * 100);
          setCurrentProgress(pct);
        }

        // Complete upload
        const ext = file.name.includes(".") ? "." + file.name.split(".").pop() : "";
        const completeRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "complete",
            uploadId,
            name: item.customName.trim() + ext,
            type: file.type || "application/octet-stream",
            size: file.size,
          }),
        });

        if (!completeRes.ok) {
          throw new Error(`Failed to finalize upload for "${file.name}"`);
        }

        const completeData = await completeRes.json();
        onAdd(completeData.document);
      }

      toast.success(
        pending.length === 1
          ? `"${pending[0].customName}" uploaded successfully`
          : `${pending.length} files uploaded successfully`
      );
      setPending([]);
      setStagingOpen(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred during file upload.");
    } finally {
      setUploadingAll(false);
    }
  };

  // ── cancel all pending ────────────────────────────────────────────────────
  const cancelAll = () => {
    setPending([]);
    setStagingOpen(false);
  };

  // ── preview / download existing doc ──────────────────────────────────────
  const handleDownload = (doc: Document) => {
    if (doc.url) {
      const a = document.createElement("a");
      a.href = doc.url;
      a.download = doc.name;
      a.click();
      toast.success(`Downloading "${doc.name}"`);
    } else {
      toast.info(`No file data stored for "${doc.name}"`);
    }
  };

  const handleView = (doc: Document) => {
    if (doc.url) setPreviewDoc(doc);
    else toast.info(`No preview available for "${doc.name}"`);
  };

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── DROP ZONE ── */}
      {canUpload && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all select-none group",
            dragOver
              ? "border-blue-500 bg-blue-50 scale-[1.01] shadow-inner"
              : "border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 bg-slate-50/60"
          )}
        >
          {/* animated icon */}
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
            dragOver ? "bg-blue-500 shadow-lg shadow-blue-300" : "bg-blue-100 group-hover:bg-blue-200"
          )}>
            <UploadCloud className={cn("w-7 h-7 transition-colors", dragOver ? "text-white" : "text-blue-500")} />
          </div>

          <div className="text-center">
            <p className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
              {dragOver ? "Release to add files" : "Click to browse or drag & drop"}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              Upload multiple files at once — PDF, DOCX, JPG, PNG, XLS, ZIP and more
            </p>
          </div>

          {/* "add more" pill if already have docs */}
          {documents.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white border border-blue-200 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full">
              <Plus className="w-3 h-3" />
              Add more files
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="*/*"
            multiple
            onChange={handleInputChange}
          />
        </div>
      )}

      {/* ── EXISTING DOCUMENTS LIST ── */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-1">
            <FileText className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-400">No documents uploaded yet</p>
          {canUpload && (
            <p className="text-[11px] text-slate-400 font-medium">
              Use the upload area above to attach files
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* header row */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {label} &nbsp;·&nbsp; {documents.length} file{documents.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* file rows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {documents.map((doc) => {
              const Icon = getFileIcon(doc.name);
              const style = getIconStyle(doc.name);
              return (
                <div
                  key={doc.id}
                  className="group flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-sm transition-all"
                >
                  {/* icon */}
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0", style)}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate leading-snug" title={doc.name}>
                      {doc.name}
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                      {doc.uploadedBy} &nbsp;·&nbsp; {doc.uploadedDate}
                    </p>
                    <span className={cn(
                       "inline-flex items-center gap-0.5 text-[8px] font-extrabold mt-0.5 uppercase tracking-wide",
                       doc.url ? "text-emerald-600" : "text-amber-500"
                    )}>
                      {doc.url
                        ? <><CheckCircle2 className="w-2.5 h-2.5" /> Stored</>
                        : <><AlertCircle className="w-2.5 h-2.5" /> Name only</>
                      }
                    </span>
                  </div>

                  {/* action buttons — always visible on mobile, hover on desktop */}
                  <div className="flex gap-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleView(doc)}
                      title="Preview"
                      className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {canDownload && (
                      <button
                        onClick={() => handleDownload(doc)}
                        title="Download"
                        className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && onDelete && (
                      <button
                        onClick={() => { onDelete(doc.id); toast.success(`"${doc.name}" removed`); }}
                        title="Delete"
                        className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STAGING DIALOG ── */}
      <Dialog open={stagingOpen} onOpenChange={(o) => { if (!uploadingAll && !o) cancelAll(); }}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-0 max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">

          {/* header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-violet-600">
            <div>
              <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-4 h-4" />
                Upload {pending.length} file{pending.length !== 1 ? "s" : ""}
              </DialogTitle>
              <DialogDescription className="text-[10px] text-blue-200 mt-0.5">
                Set a clear name for each document before saving
              </DialogDescription>
            </div>
            {/* add more button in header */}
            {canUpload && !uploadingAll && (
              <button
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add more
              </button>
            )}
          </div>

          {/* file list */}
          <div className="px-6 py-4 space-y-3 max-h-[55vh] overflow-y-auto">
            {pending.map((item, idx) => {
              const Icon = getFileIcon(item.file.name);
              const style = getIconStyle(item.file.name);
              const isImage = item.file.type.startsWith("image/");
              return (
                <div key={idx} className="flex gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">

                  {/* thumbnail or icon */}
                  <div className="flex-shrink-0">
                    {isImage && item.dataUrl ? (
                      <img
                        src={item.dataUrl}
                        alt="preview"
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-sm"
                      />
                    ) : (
                      <div className={cn("w-14 h-14 rounded-xl border flex flex-col items-center justify-center gap-1", style)}>
                        <Icon className="w-6 h-6" />
                        <span className="text-[8px] font-extrabold uppercase tracking-wider opacity-70">
                          {fileExt(item.file.name) || "FILE"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* name field + file meta */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div>
                      <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        Document Name <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        value={item.customName}
                        onChange={(e) => updateName(idx, e.target.value)}
                        placeholder="e.g. Passport Copy, Visa Page, Emirates ID"
                        className="mt-1 h-8 text-xs rounded-xl border-slate-200 focus:border-blue-400 bg-white"
                        autoFocus={idx === 0}
                        disabled={uploadingAll}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const inputs = document.querySelectorAll<HTMLInputElement>("[data-doc-name-input]");
                            const current = Array.from(inputs).findIndex((el) => el === e.currentTarget);
                            if (current < inputs.length - 1) inputs[current + 1].focus();
                            else confirmUploadAll();
                          }
                        }}
                        data-doc-name-input
                      />
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-slate-400 font-medium">
                      <span className="truncate max-w-[160px]">{item.file.name}</span>
                      <span className="flex-shrink-0 font-bold text-slate-500">
                        {formatBytes(item.file.size)}
                      </span>
                    </div>
                  </div>

                  {/* remove this file */}
                  {!uploadingAll && (
                    <button
                      onClick={() => removePending(idx)}
                      className="flex-shrink-0 w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-500 transition-colors mt-0.5"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* empty fallback */}
            {pending.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">All files removed.</div>
            )}
          </div>

          {/* footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
            {uploadingAll ? (
              <div className="w-full flex flex-col gap-1.5 py-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>Uploading file {currentUploadIndex + 1} of {pending.length}: "{pending[currentUploadIndex]?.customName}"...</span>
                  <span>{currentProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${currentProgress}%` }} />
                </div>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-slate-400 font-medium">
                  {pending.length} file{pending.length !== 1 ? "s" : ""} ready to upload
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={cancelAll}
                    disabled={uploadingAll}
                    className="text-xs rounded-xl px-4 h-9 text-slate-600 hover:bg-slate-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmUploadAll}
                    disabled={uploadingAll || pending.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs px-5 h-9 gap-2 shadow-md shadow-blue-500/20 min-w-[120px]"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Upload {pending.length > 1 ? `All ${pending.length}` : "File"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* PREVIEW DIALOG */}
      <Dialog open={!!previewDoc} onOpenChange={(o) => { if (!o) setPreviewDoc(null); }}>
        <DialogContent className="rounded-3xl bg-white border border-slate-100 shadow-2xl p-0 max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">

          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800 truncate">{previewDoc?.name}</h3>
              <p className="text-[10px] text-slate-400 font-medium">
                Uploaded by {previewDoc?.uploadedBy} &nbsp;·&nbsp; {previewDoc?.uploadedDate}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0 ml-4">
              {canDownload && previewDoc && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(previewDoc)}
                  className="rounded-xl text-xs h-8 gap-1.5 border-slate-200 font-bold"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
              )}
              <button
                onClick={() => setPreviewDoc(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-auto bg-slate-50">
            {previewDoc?.url ? (
              previewDoc.type?.startsWith("image/") || previewDoc.url.startsWith("data:image/") ? (
                <div className="p-4">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.name}
                    className="max-w-full mx-auto rounded-xl shadow-md"
                  />
                </div>
              ) : previewDoc.type === "application/pdf" || previewDoc.url.includes("pdf") ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.name}
                  className="w-full h-[65vh] border-0"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
                  <div className={cn("w-16 h-16 rounded-2xl border flex items-center justify-center", getIconStyle(previewDoc.name))}>
                    {(() => { const I = getFileIcon(previewDoc.name); return <I className="w-8 h-8" />; })()}
                  </div>
                  <p className="text-sm font-bold text-slate-600">{previewDoc.name}</p>
                  <p className="text-xs text-slate-400 font-medium">
                    Preview is not available for this file type.
                  </p>
                  <Button
                    onClick={() => handleDownload(previewDoc!)}
                    className="bg-blue-600 text-white rounded-xl text-xs gap-1.5 mt-2"
                  >
                    <Download className="w-3.5 h-3.5" /> Download to view
                  </Button>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <AlertCircle className="w-12 h-12 text-amber-300" />
                <p className="text-sm font-semibold text-slate-500">
                  No file data — this entry was created from a name only.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
