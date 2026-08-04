/**
 * ProfilePage —— 个人中心（规范文档 8.5）
 *
 * 协调链路（与后端契约对齐）：
 *   用户画像   userStore 本地持久化；后端仅有 UserProfileDto（userId 固定 anonymous），
 *             暂无 GET/PUT /api/user/profile 接口，提供后在此切换。
 *   简历上传   FileUpload 保存文件元信息到 localStorage；后端 ResumeParsingTool
 *             按 resumeId（= 文件名）从 data/resumes 目录读取，需将简历放入该目录。
 */
import { useState, type ReactNode } from 'react';
import { Save, RotateCcw, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useUserStore } from '@/stores/userStore';
import { STORAGE_KEYS } from '@/utils/constants';
import type { ResumeMeta } from '@/types/user';
import { Button } from '@/components/common/Button';
import { FileUpload } from '@/components/common/FileUpload';

/** 经验水平选项 */
const EXPERIENCE_LEVELS = ['在校生', '应届生', '1-3 年', '3-5 年', '5 年以上'];

function loadResumeMeta(): ResumeMeta | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.resumeMeta);
    return raw ? (JSON.parse(raw) as ResumeMeta) : null;
  } catch {
    return null;
  }
}

const INPUT_CLASS =
  'w-full rounded-xl border border-brown-200 bg-white px-3 py-2 text-sm text-brown-900 outline-none transition-colors placeholder:text-brown-300 focus:border-accent focus:ring-2 focus:ring-accent-light';

/** 表单字段容器（标签 + 输入） */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-brown-700">{label}</span>
      {children}
    </label>
  );
}

export default function ProfilePage() {
  const profile = useUserStore();
  const [resumeMeta, setResumeMeta] = useState<ResumeMeta | null>(loadResumeMeta);
  const [draft, setDraft] = useState({
    displayName: profile.displayName,
    targetPosition: profile.targetPosition,
    experienceLevel: profile.experienceLevel,
    strengths: profile.strengths,
    weaknesses: profile.weaknesses,
  });

  const set = (key: keyof typeof draft, value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = () => {
    if (!draft.displayName.trim()) {
      toast.error('请填写称呼');
      return;
    }
    profile.setProfile(draft);
    toast.success('个人画像已保存');
  };

  const handleReset = () => {
    profile.resetProfile();
    setDraft({
      displayName: '咖啡学员',
      targetPosition: '',
      experienceLevel: '',
      strengths: '',
      weaknesses: '',
    });
    toast.success('已恢复默认画像');
  };

  return (
    <div className="mx-auto flex max-w-2xl animate-fade-in flex-col gap-5">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brown-100 text-brown-700">
          <UserRound className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-brown-900">个人中心</h1>
          <p className="mt-0.5 text-sm text-brown-500">完善画像，让咖啡师更懂你（userId: {profile.userId}）</p>
        </div>
      </div>

      {/* 简历 */}
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brown-100">
        <h2 className="mb-1 font-display text-lg font-bold text-brown-900">简历关联</h2>
        <p className="mb-4 text-xs leading-relaxed text-brown-500">
          手冲模式会参考简历进行项目深挖。当前后端按文件名从 data/resumes
          目录读取简历，请将简历放入后端项目该目录后在此关联文件名。
        </p>
        <FileUpload value={resumeMeta} onChange={setResumeMeta} />
        {resumeMeta && (
          <p className="mt-2 text-xs text-brown-400">上传时间：{new Date(resumeMeta.uploadedAt).toLocaleString()}</p>
        )}
      </section>

      {/* 画像表单 */}
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brown-100">
        <h2 className="mb-4 font-display text-lg font-bold text-brown-900">面试画像</h2>
        <div className="flex flex-col gap-4">
          <Field label="称呼">
            <input
              className={INPUT_CLASS}
              value={draft.displayName}
              placeholder="咖啡学员"
              maxLength={20}
              onChange={(e) => set('displayName', e.target.value)}
            />
          </Field>

          <Field label="目标岗位">
            <input
              className={INPUT_CLASS}
              value={draft.targetPosition}
              placeholder="如：Java 后端开发工程师"
              maxLength={50}
              onChange={(e) => set('targetPosition', e.target.value)}
            />
          </Field>

          <Field label="经验水平">
            <select
              className={INPUT_CLASS}
              value={draft.experienceLevel}
              onChange={(e) => set('experienceLevel', e.target.value)}
            >
              <option value="">请选择</option>
              {EXPERIENCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </Field>

          <Field label="优势（一句话描述你的强项）">
            <textarea
              className={`${INPUT_CLASS} min-h-[72px] resize-y`}
              value={draft.strengths}
              placeholder="如：熟悉 Spring Cloud 微服务，有高并发项目经验"
              maxLength={200}
              onChange={(e) => set('strengths', e.target.value)}
            />
          </Field>

          <Field label="待提升（希望咖啡师重点考察的方向）">
            <textarea
              className={`${INPUT_CLASS} min-h-[72px] resize-y`}
              value={draft.weaknesses}
              placeholder="如：分布式事务、Kafka 消息可靠性"
              maxLength={200}
              onChange={(e) => set('weaknesses', e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            恢复默认
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4" />
            保存画像
          </Button>
        </div>
      </section>
    </div>
  );
}
