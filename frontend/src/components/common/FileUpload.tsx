/**
 * FileUpload —— 简历上传（规范文档 9.3）
 *
 * 协调说明：后端 ResumeParsingTool 按 resumeId（= 清洗后文件名）从 data/resumes 目录读取；
 * 此处真实上传到 POST /api/resume/upload，成功后将后端返回的 meta 写回 onChange 与 localStorage。
 */
import { useRef, useState, type ChangeEvent } from 'react';
import { FileUp, FileCheck2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';
import { resumeMetaKey } from '@/utils/constants';
import { useUserStore } from '@/stores/userStore';
import { resumeApi } from '@/api/resume';
import type { ResumeMeta } from '@/types/user';

interface FileUploadProps {
  accept?: string;
  maxSizeMB?: number;
  value: ResumeMeta | null;
  onChange: (meta: ResumeMeta | null) => void;
}

export function FileUpload({ accept = '.pdf,.doc,.docx,.md,.txt', maxSizeMB = 5, value, onChange }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = useUserStore((s) => s.userId);

  const handleFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`文件不能超过 ${maxSizeMB}MB`);
      return;
    }

    // 真实上传：后端落盘到 data/resumes，返回的 meta.id 即 ResumeParsingTool 的 resumeId
    setUploading(true);
    try {
      const meta = await resumeApi.upload(file);
      onChange(meta);
      // 按当前 userId 写入隔离 key，避免跨账号可见
      localStorage.setItem(resumeMetaKey(userId), JSON.stringify(meta));
      toast.success('简历上传成功');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '上传失败，请重试';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    void handleFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          dragging ? 'border-accent bg-accent/5' : 'border-brown-300 bg-brown-100/50 hover:border-accent',
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm font-medium text-brown-700">正在上传…</p>
          </>
        ) : value ? (
          <>
            <FileCheck2 className="h-8 w-8 text-success" />
            <p className="text-sm font-medium text-brown-900">{value.fileName}</p>
            <p className="text-xs text-brown-500">已选择，点击可重新上传</p>
          </>
        ) : (
          <>
            <FileUp className="h-8 w-8 text-brown-500" />
            <p className="text-sm font-medium text-brown-700">点击或拖拽上传简历</p>
            <p className="text-xs text-brown-500">支持 PDF / Word / Markdown，最大 {maxSizeMB}MB</p>
          </>
        )}
      </button>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleInput} />
      {error && <p className="mt-2 text-xs text-error">{error}</p>}
    </div>
  );
}
