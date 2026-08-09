/**
 * InsightsPanel —— 历史报告数据可视化框（历史页下方）
 *
 * 左栏：个人多项能力雷达图（固定 12 维能力模型，启发式聚合所有历史报告的
 *       strengths/weaknesses，无命中的维度归 0 并标注"暂无"）；
 * 右栏：语言表达具体细节（命中"语言表达"维度的评价条目，按亮点/待改进分组，
 *       每条带来源场次：模式 + 日期）。
 */
import { useMemo } from 'react';
import { AlertTriangle, BarChart3, MessageSquareText, Sparkles } from 'lucide-react';
import type { InterviewReport } from '@/stores/interviewStore';
import { buildRadarData, collectExpressionDetails } from '@/utils/insights';
import { RadarChart } from './RadarChart';

interface InsightsPanelProps {
  /** 历史报告列表（含 strengths/weaknesses 明细） */
  reports: InterviewReport[];
}

/** 维度分数标签：>=70 暖橙、>=50 棕、<50 灰（与 ScoreCircle 分级思路一致） */
function chipClass(value: number): string {
  if (value >= 70) return 'bg-accent/10 text-accent';
  if (value >= 50) return 'bg-brown-100 text-brown-700';
  return 'bg-brown-100/60 text-brown-400';
}

export function InsightsPanel({ reports }: InsightsPanelProps) {
  const radarData = useMemo(() => buildRadarData(reports), [reports]);
  const expression = useMemo(() => collectExpressionDetails(reports), [reports]);

  const hasRadar = reports.length > 0;
  const hasStrengths = expression.strengths.length > 0;
  const hasWeaknesses = expression.weaknesses.length > 0;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-brown-100">
      {/* 标题区 */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-accent" />
        <h2 className="font-display text-lg font-bold text-brown-900">个人能力图谱</h2>
        <span className="text-xs text-brown-400">基于 {reports.length} 份杯测报告聚合</span>
      </div>

      <div className="mt-5 flex flex-col gap-8 lg:flex-row">
        {/* 左栏：能力雷达图 */}
        <div className="flex min-w-0 flex-1 flex-col items-center">
          {hasRadar ? (
            <>
              <RadarChart data={radarData} />
              {/* 维度分数标签（无命中的维度显示"暂无"，灰显） */}
              <div className="mt-2 flex max-w-[340px] flex-wrap justify-center gap-1.5">
                {radarData.map((d) => {
                  const empty = d.hits === 0 && d.misses === 0;
                  return (
                    <span
                      key={d.dimension}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        empty ? 'bg-brown-100/40 text-brown-300' : chipClass(d.value)
                      }`}
                    >
                      {d.dimension} {empty ? '暂无' : Math.round(d.value)}
                    </span>
                  );
                })}
              </div>
              <p className="mt-3 text-center text-xs leading-relaxed text-brown-400">
                固定 12 维能力模型，由各场报告中的优势亮点 / 薄弱环节聚合估算，用于观察能力侧重点
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="text-3xl">📊</span>
              <p className="text-sm font-medium text-brown-700">能力数据还在沉淀中</p>
              <p className="max-w-xs text-xs leading-relaxed text-brown-400">
                完成更多场面试后，这里会按方向聚合出你的能力雷达图
              </p>
            </div>
          )}
        </div>

        {/* 右栏：语言表达具体细节 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-brown-700">
            <MessageSquareText className="h-4 w-4 text-accent" />
            语言表达细节
          </h3>

          <div className="mt-3 grid flex-1 gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {/* 表达亮点 */}
            <div className="min-h-24 rounded-2xl bg-success/5 p-4 ring-1 ring-success/10">
              <p className="flex items-center gap-1 text-xs font-semibold text-success">
                <Sparkles className="h-3.5 w-3.5" />
                表达亮点
              </p>
              {hasStrengths ? (
                <ul className="mt-2.5 flex max-h-44 flex-col gap-2.5 overflow-y-auto pr-1">
                  {expression.strengths.map((item) => (
                    <li key={`${item.sessionId}-${item.topic}`} className="text-xs leading-relaxed">
                      <span className="font-medium text-brown-700">{item.topic}</span>
                      <span className="ml-1.5 text-brown-400">
                        {item.modeLabel} · {item.date}
                      </span>
                      {item.comment && <p className="mt-0.5 text-brown-600/90">{item.comment}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2.5 text-xs text-brown-400">暂无表达相关的亮点记录</p>
              )}
            </div>

            {/* 表达待改进 */}
            <div className="min-h-24 rounded-2xl bg-warning/5 p-4 ring-1 ring-warning/10">
              <p className="flex items-center gap-1 text-xs font-semibold text-warning">
                <AlertTriangle className="h-3.5 w-3.5" />
                表达待改进
              </p>
              {hasWeaknesses ? (
                <ul className="mt-2.5 flex max-h-44 flex-col gap-2.5 overflow-y-auto pr-1">
                  {expression.weaknesses.map((item) => (
                    <li key={`${item.sessionId}-${item.topic}`} className="text-xs leading-relaxed">
                      <span className="font-medium text-brown-700">{item.topic}</span>
                      <span className="ml-1.5 text-brown-400">
                        {item.modeLabel} · {item.date}
                      </span>
                      {item.comment && <p className="mt-0.5 text-brown-600/90">{item.comment}</p>}
                      {item.suggestion && (
                        <p className="mt-0.5 text-warning/90">建议：{item.suggestion}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2.5 text-xs text-brown-400">暂无表达相关的改进记录</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
