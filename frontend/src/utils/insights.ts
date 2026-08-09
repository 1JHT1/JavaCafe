/**
 * 历史报告聚合分析工具 —— 供历史页"个人能力可视化框"使用
 *
 * 数据源：每场杯测报告的 strengths / weaknesses（topic + comment 文本）。
 * 评分策略（启发式，无后端额外计算）：
 *   固定能力维度池，命中亮点关键词 +1 分、命中薄弱关键词 -1 分，
 *   聚合所有历史报告后映射为 0-100 的雷达图数值（50 为基线）。
 * 语言表达细节：单独筛出命中"语言表达"维度的条目，按亮点/待改进分组展示。
 */
import type { InterviewReport } from '@/stores/interviewStore';
import { formatDate, reportModeLabel } from './format';

/** 能力维度定义（轴标签 + 命中关键词） */
export interface AbilityDimension {
  /** 维度标识 */
  key: string;
  /** 中文轴标签 */
  label: string;
  /** 命中关键词（与 topic/comment 小写化文本做 includes 匹配） */
  keywords: string[];
}

/** 固定维度池：11 大 Java 后端八股方向 + 语言表达（语言表达同时驱动"具体细节"区块） */
export const ABILITY_DIMENSIONS: AbilityDimension[] = [
  {
    key: 'java',
    label: 'Java 基础',
    keywords: [
      'java基础', 'java 基础', '面向对象', '集合', '泛型', '反射', '注解', '异常',
      'string', '字符串', '基础语法', 'hashmap', 'arraylist', 'linkedlist', 'hashset', 'treemap',
    ],
  },
  {
    key: 'jvm',
    label: 'JVM',
    keywords: ['jvm', '类加载', '垃圾回收', 'gc', '内存模型', '堆内存', '常量池', '内存区域', '双亲委派', '分代'],
  },
  {
    key: 'concurrency',
    label: '并发',
    keywords: ['并发', '多线程', '线程池', 'volatile', 'synchronized', 'cas', 'juc', '线程安全', 'aqs', 'reentrantlock', '锁升级'],
  },
  {
    key: 'spring',
    label: 'Spring',
    keywords: ['spring', 'ioc', 'aop', 'bean', '依赖注入', '事务传播', '循环依赖', '自动配置', 'mvc', 'bean 生命周期', 'aop 动态代理'],
  },
  {
    key: 'mybatis',
    label: 'MyBatis',
    keywords: ['mybatis', 'mybatis-plus', 'mapper', '动态sql', '动态 sql', '一级缓存', '二级缓存', 'orm', 'xml 映射', 'xml映射', '#{}', '${'],
  },
  {
    key: 'mysql',
    label: 'MySQL',
    keywords: ['mysql', 'sql', '索引', '慢查询', 'b+树', 'b+ 树', '主从', 'mvcc', '聚簇', '回表', '事务隔离', '间隙锁', '覆盖索引', 'explain'],
  },
  {
    key: 'redis',
    label: 'Redis',
    keywords: ['redis', '缓存', '分布式锁', '持久化', '布隆', '击穿', '雪崩', '穿透', '哨兵', 'setnx', 'redisson', '缓存一致性', 'aof', 'rdb'],
  },
  {
    key: 'mq',
    label: '消息队列',
    keywords: ['消息队列', 'mq', 'kafka', 'rabbitmq', 'rocketmq', '削峰', '消息积压', '顺序消息', '重复消费', '死信', '延迟队列', '消费组'],
  },
  {
    key: 'distributed',
    label: '分布式微服务',
    keywords: ['分布式', '微服务', '分布式事务', 'cap', '注册中心', 'nacos', 'eureka', 'zookeeper', '网关', 'gateway', '熔断', '限流', 'rpc', 'dubbo', '幂等', 'seata', '配置中心', '服务治理'],
  },
  {
    key: 'network',
    label: '计算机网络',
    keywords: ['tcp', 'udp', 'http', 'https', '网络', '三次握手', '四次挥手', '拥塞', 'dns', 'tls', '状态码', '粘包', '半连接', 'keep-alive'],
  },
  {
    key: 'os',
    label: '操作系统',
    keywords: ['操作系统', '进程', '内存管理', '虚拟内存', 'epoll', 'io多路复用', '用户态', '内核态', '页面置换', '调度', '死锁', '零拷贝', '信号量', '文件系统'],
  },
  {
    key: 'expression',
    label: '语言表达',
    keywords: ['表达', '沟通', '条理', '逻辑', '清晰', '叙述', '组织', '语言', '流畅', '术语', '结构', '简洁', '口语'],
  },
];

/** 雷达图单维度聚合结果 */
export interface RadarDatum {
  /** 维度中文标签 */
  dimension: string;
  /** 0-100 聚合分（50 基线，亮点抬升、薄弱拉低） */
  value: number;
  /** 命中的亮点条数 */
  hits: number;
  /** 命中的薄弱条数 */
  misses: number;
}

/** 语言表达细节条目（带来源场次信息） */
export interface ExpressionItem {
  sessionId: string;
  /** 模式中文名 */
  modeLabel: string;
  /** yyyy-MM-dd */
  date: string;
  topic: string;
  comment: string;
  suggestion: string;
  kind: 'strength' | 'weakness';
}

/** 单条文本命中某维度的关键词（小写化 includes） */
function hitKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

/** 命中维度数（0-12），一条评价可同时命中多个维度（内容本身跨域） */
function hitDimensions(text: string): Set<string> {
  const hit = new Set<string>();
  for (const dim of ABILITY_DIMENSIONS) {
    if (hitKeyword(text, dim.keywords)) hit.add(dim.key);
  }
  return hit;
}

/**
 * 聚合所有历史报告 → 雷达图数据。
 * 固定返回全部 12 维（不随完成场次增减）：有命中的维度按命中数计分，
 * 无任何命中的维度归 0（表示暂无该方向的评价记录，页面标注"暂无"）。
 */
export function buildRadarData(reports: InterviewReport[]): RadarDatum[] {
  const delta = new Map<string, number>();
  const hits = new Map<string, number>();
  const misses = new Map<string, number>();

  for (const report of reports) {
    for (const s of report.strengths) {
      const text = `${s.topic} ${s.comment}`;
      if (!text.trim()) continue;
      for (const key of hitDimensions(text)) {
        delta.set(key, (delta.get(key) ?? 0) + 1);
        hits.set(key, (hits.get(key) ?? 0) + 1);
      }
    }
    for (const w of report.weaknesses) {
      const text = `${w.topic} ${w.comment}`;
      if (!text.trim()) continue;
      for (const key of hitDimensions(text)) {
        delta.set(key, (delta.get(key) ?? 0) - 1);
        misses.set(key, (misses.get(key) ?? 0) + 1);
      }
    }
  }

  return ABILITY_DIMENSIONS.map((dim) => {
    const d = delta.get(dim.key);
    return {
      dimension: dim.label,
      // 未命中维度归 0（雷达图上落在中心点）；命中维度以 50 为基线，每条命中 ±22 分（典型 ±2 条 → 6~94），钳制到 5-100
      value: d === undefined ? 0 : Math.max(5, Math.min(100, 50 + d * 22)),
      hits: hits.get(dim.key) ?? 0,
      misses: misses.get(dim.key) ?? 0,
    };
  });
}

/**
 * 筛选"语言表达"相关评价条目（命中语言表达维度），按亮点/待改进分组。
 * 历史报告无表达评价时返回空数组，页面显示占位提示。
 */
export function collectExpressionDetails(reports: InterviewReport[]): {
  strengths: ExpressionItem[];
  weaknesses: ExpressionItem[];
} {
  const expressionDim = ABILITY_DIMENSIONS.find((d) => d.key === 'expression');
  const strengths: ExpressionItem[] = [];
  const weaknesses: ExpressionItem[] = [];

  for (const report of reports) {
    const meta = { sessionId: report.sessionId, modeLabel: reportModeLabel(report.mode), date: formatDate(report.createdAt) };
    for (const s of report.strengths) {
      const text = `${s.topic} ${s.comment}`;
      if (expressionDim && hitKeyword(text, expressionDim.keywords)) {
        strengths.push({ ...meta, topic: s.topic, comment: s.comment, suggestion: '', kind: 'strength' });
      }
    }
    for (const w of report.weaknesses) {
      const text = `${w.topic} ${w.comment}`;
      if (expressionDim && hitKeyword(text, expressionDim.keywords)) {
        weaknesses.push({ ...meta, topic: w.topic, comment: w.comment, suggestion: w.suggestion, kind: 'weakness' });
      }
    }
  }
  return { strengths, weaknesses };
}
