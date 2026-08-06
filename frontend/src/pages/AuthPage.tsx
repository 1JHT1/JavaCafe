/**
 * AuthPage —— 登录 / 注册（P0-3 认证体系前端）
 *
 * 协调链路：提交表单 → authApi.login/register → 后端签发 JWT →
 * useUserStore.setAuth 写入登录态（token 落 localStorage，client.getToken 自动携带）。
 */
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/api/auth';
import { useUserStore } from '@/stores/userStore';
import { Button } from '@/components/common/Button';

type Tab = 'login' | 'register';

const INPUT_CLASS =
  'w-full rounded-xl border border-brown-200 bg-white px-3 py-2 text-sm text-brown-900 outline-none transition-colors placeholder:text-brown-300 focus:border-accent focus:ring-2 focus:ring-accent-light';

export default function AuthPage() {
  const navigate = useNavigate();
  const setAuth = useUserStore((s) => s.setAuth);
  const loadProfileFromServer = useUserStore((s) => s.loadProfileFromServer);
  const [tab, setTab] = useState<Tab>('login');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', displayName: '' });

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password) {
      toast.error('请填写用户名和密码');
      return;
    }
    if (tab === 'register' && !form.displayName.trim()) {
      toast.error('请填写你的称呼');
      return;
    }
    setSubmitting(true);
    try {
      const auth = tab === 'login'
        ? await authApi.login({ username: form.username.trim(), password: form.password })
        : await authApi.register({
            username: form.username.trim(),
            password: form.password,
            displayName: form.displayName.trim(),
          });
      setAuth(auth);
      // 登录成功后拉取服务器画像，覆盖本地旧画像（游客数据不迁移）
      void loadProfileFromServer();
      toast.success(tab === 'login' ? `欢迎回来，${auth.displayName || auth.username}` : '注册成功，开始面试之旅');
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md animate-fade-in flex-col gap-5">
      {/* 标题 */}
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brown-100 text-brown-700">
          <Coffee className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-brown-900">欢迎来到 JavaCafe</h1>
          <p className="mt-0.5 text-sm text-brown-500">登录后可将画像与历史记录同步到云端</p>
        </div>
      </div>

      {/* 表单卡片 */}
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brown-100">
        {/* Tab 切换 */}
        <div className="mb-5 flex rounded-xl bg-brown-50 p-1">
          {(
            [
              { key: 'login', label: '登录', icon: LogIn },
              { key: 'register', label: '注册', icon: UserPlus },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={
                tab === key
                  ? 'flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brown-700 py-2 text-sm font-medium text-cream transition-colors'
                  : 'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-brown-500 transition-colors hover:text-brown-700'
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {tab === 'register' && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-brown-700">称呼</span>
              <input
                className={INPUT_CLASS}
                value={form.displayName}
                placeholder="如：阿力"
                maxLength={20}
                onChange={(e) => set('displayName', e.target.value)}
              />
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-brown-700">用户名</span>
            <input
              className={INPUT_CLASS}
              value={form.username}
              placeholder="2-32 位字母/数字/下划线"
              maxLength={32}
              autoComplete="username"
              onChange={(e) => set('username', e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-brown-700">密码</span>
            <input
              type="password"
              className={INPUT_CLASS}
              value={form.password}
              placeholder={tab === 'register' ? '至少 6 位' : '输入密码'}
              maxLength={64}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              onChange={(e) => set('password', e.target.value)}
            />
          </label>

          <Button type="submit" disabled={submitting} className="mt-1">
            {submitting ? '请稍候…' : tab === 'login' ? '登录' : '注册并登录'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs leading-relaxed text-brown-400">
          未登录也可直接以游客身份开始面试，登录仅用于同步画像与历史记录。
        </p>
      </section>
    </div>
  );
}
