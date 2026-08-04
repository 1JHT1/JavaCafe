/**
 * FileUpload —— 简历上传（规范文档 9.3）
 *
 * 协调说明：后端 ResumeParsingTool 按 resumeId 从 data/resumes 目录读取，
 * 目前没有上传接口。这里先本地保存文件元信息（文件名作为 resumeId），
 * 提示用户将简历放入后端 data/resumes 目录；等上传接口开放后切换。
 */
import { useRef, useState, type ChangeEvent } from 'react';
import { FileUp, FileCheck2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { STORAGE_KEYS } from '@/utils/constants';
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
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    setError(null);
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`文件不能超过 ${maxSizeMB}MB`);
      return;
    }

    // 文件名作为 resumeId（后端读取 data/resumes 下同名文件）
    const meta: ResumeMeta = {
      id: file.name,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
    };
    onChange(meta);
    localStorage.setItem(STORAGE_KEYS.resumeMeta, JSON.stringify(meta));
  };

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 transition-colors',
          dragging ? 'border-accent bg-accent/5' : 'border-brown-300 bg-brown-100/50 hover:border-accent',
        )}
      >
        {value ? (
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
