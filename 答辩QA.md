# JavaCafe 答辩 QA 准备

> 模拟评委提问 + 答题要点。三个方向：技术选型 / 代码设计 / 创新点。
> 演练建议：先不看提示自答一遍，再对照"答题要点"查漏；重点练 Q10、Q11、Q14 三道深度题。

---

## 一、技术选型方向

### Q1. 为什么选 Spring AI 1.0.0-M5 这个里程碑版本，而不是稳定版或直接用 HttpClient 调 DeepSeek API？

- 考察点：版本选型的风险意识
- 答题要点：
  - 统一了 ChatClient / VectorStore 抽象，后续切换模型零成本
  - M5 是功能较全的里程碑版本，配合 `spring-ai-alibaba` 扩展适配 DeepSeek
  - 显式声明 Reactor Core 依赖，规避里程碑版传递依赖的坑

### Q2. DeepSeek 没有 embedding API，你们的 RAG 怎么解决向量化？

- 考察点：系统约束下的工程权衡
- 答题要点：
  - 使用本地 ONNX 模型（all-MiniLM-L6-v2）做 embedding，pgvector 存储与检索
  - 数据不出内网，无外部 API 依赖
  - 承认中文效果与专用模型有差距，但八股文场景的术语匹配足够

### Q3. 为什么用 LangChain4j 而不是 LangGraph 做 Agent 编排？

- 考察点：依赖选型的可维护性
- 答题要点：
  - LangGraph 生态重、与 Java/Spring 集成成本高
  - LangChain4j 轻量、与 Spring AI 兼容
  - 当前工作流（出题 → 作答 → 评估 → 追问）是同步调用链，无需图编排的复杂能力

### Q4. 会话上下文为什么用 Redis 而不是数据库表？

- 考察点：存储选型匹配场景
- 答题要点：
  - 高频读写 + 短生命周期 + 滑动过期（TTL 2 小时）天然适合 Redis
  - 消息窗口裁剪（≤50 条）控制单 key 体积
  - 正常结束/取消时主动清理，Redis 只兜底异常断开

### Q5. 长期记忆为什么用 pgvector 而不是独立向量数据库（如 Milvus）？

- 考察点：组件收敛意识
- 答题要点：
  - 数据量级（单用户会话数）pgvector 足够
  - 一套 PostgreSQL 同时管关系数据与向量，避免多组件运维
  - `metadata.source` 同表隔离用户记忆与知识库

### Q6. 前端为什么选 zustand 而不是 Redux？

- 考察点：状态管理选型
- 答题要点：
  - SSE 会话状态高频变更，zustand 的 selector 订阅粒度避免全量重渲染
  - persist 中间件天然支持刷新恢复（半截消息、isStreaming、lastEventSeq）
  - 与 React 18 并发特性契合，心智负担低

### Q7. 简历解析为什么用 Apache Tika？

- 考察点：第三方库选型
- 答题要点：
  - 统一入口支持 docx / pdf / md 多格式文本提取
  - 不需要自研格式解析，代码量小、格式覆盖面广

### Q8. SSE 为什么不用 WebSocket？

- 考察点：通信协议理解
- 答题要点：
  - 场景是"AI → 用户单向推送为主，用户提交走普通 POST"，SSE 语义更贴合
  - SSE 原生支持自动重连与事件 id（lastEventId），WebSocket 需自建心跳/重连/序号
  - Spring WebFlux 对 SSE 原生友好，服务端实现简单

---

## 二、代码设计方向

### Q9. 后端 5 模块分层的依赖规则是什么？为什么这么分？

- 考察点：模块化设计
- 答题要点：
  - 单向依赖：common → api → infrastructure → core → web
  - 契约（DTO / 接口）独立成模块，避免循环依赖
  - core 不感知 web 层，AI 工作流可独立测试

### Q10. SSE 会话存在内存 Map 里，服务重启 / 多实例部署时会话不就丢了吗？

- 考察点：架构边界认知（高频刁钻题）
- 答题要点：
  - 诚实说明：当前为单实例部署（Docker Compose），会话在内存
  - 兜底：前端 persist + Redis 短期记忆，重启后重新续传可恢复上下文
  - 横向扩展需引入分布式会话（如 Redis pub/sub 广播），已列入后续优化方向

### Q11. "刷新后连接还在"是怎么实现的？内部机制讲一下

- 考察点：SSE 深入理解
- 答题要点：
  - 物理断开不可逆 → 做"语义连续"：
  - 后端 sink 从 multicast 改 `replay().limit(1000)`，无订阅者期间事件进缓存不丢
  - 每个事件带会话内序号（SSE `id` 字段）
  - 前端持久化 `lastEventSeq`，重连后按序去重，半截消息 append 补齐
  - complete / error 事件同样带序号，保证终态正确复位

### Q12. 四种模式同时进行，会话怎么做到互不串扰？

- 考察点：数据隔离设计 + 并发机制理解
- 答题要点：
  - 一句话总述：**前端 4 条独立 SSE 连接 + 后端 4 个独立会话上下文，状态全部分区隔离，互不共享**；并发能力来自 Reactor 响应式（每条流独立推进）+ `ConcurrentHashMap` 按会话隔离
  - 后端：`SseEmitterHandler` 用 `ConcurrentHashMap<String, SessionContext> sessions` 按 sessionId 维护，每个会话独立拥有：replay Sink（独立重放缓存）、事件序号 `eventSeq`、生命周期状态（started / roundCount / reportStarted 均为会话级 Atomic，CAS 保证不重复启动、报告只生成一次）、模式人设（request 携带 mode，决定用哪套提示词）
  - 启动时机：`registerSession` 只建管道不启动 AI，等 `getSessionStream` 首个订阅者到达（`doOnSubscribe → startIfNeeded`）才出题——保证每会话事件序号从 1 连续，无订阅者时 AI 不空跑
  - 前端：sseManager 模块级单例 `Map<sessionId, ManagedSession>`，每会话一个 SseClient（一个 EventSource）；连接脱离页面组件（subscribeSse/退订只增删 handlers），切页不断连；事件按 mode 分区写入 store（`store.sessions[mode]`），渲染互不影响
  - 记忆隔离：Redis key 前缀 `javacafe:session:{sessionId}`（每会话一个 list）；pgvector 用户记忆按 userId 过滤（四模式同用户共享画像，但会话上下文隔离）
- 一句话背诵版：
  
  > "四个模式同时进行的关键是端到端的会话隔离。后端 SseEmitterHandler 用 ConcurrentHashMap 按 sessionId 维护会话上下文，每个会话持有独立的 replay Sink、独立的事件序号和独立的生命周期状态；AI 调用全部按 sessionId 路由，Redis 短期记忆按 javacafe:session:{sessionId} 分区。前端全局连接管理器维护多个 SseClient，连接脱离页面组件、切页不断连，事件按 mode 分区写入 store。本质就是 N 个独立会话管道并行推进，加上 WebFlux 响应式，4 条流同时生成互不阻塞。"

### Q13. 知识库和用户记忆在同一张 vector_store 表，怎么保证检索不串？

- 考察点：检索隔离实现
- 答题要点：
  - metadata 带 source 标记：知识检索按 `source='knowledge'` 过滤，用户记忆按 userId 过滤
  - 双向隔离，互不可见
  - 权衡：同表 + 标记比独立 collection 改动小，启动时全量重建保证一致性

### Q14. AI 流式输出是 WebFlux 响应式链路，哪些地方必须切线程池？为什么？

- 考察点：响应式编程正确性
- 答题要点：
  - 系统设计评估（SystemDesignEvaluator）与报告生成（ReportGeneratorTool）是同步阻塞调用
  - 必须 `Mono.fromCallable(...).subscribeOn(Schedulers.boundedElastic())`
  - 否则阻塞事件循环线程，吞吐雪崩

### Q15. 前端 SSE 连接为什么抽成全局 manager，而不放在页面组件里？

- 考察点：前端架构
- 答题要点：
  - 连接生命周期脱离组件，切页 / 路由跳转不断连
  - 四模式并发统一管理
  - 连接状态全局共享（isStreaming 驱动 UI）
  - EventSource 重试与 store 持久化解耦

### Q16. 取消面试和结束面试在数据清理上有什么区别？

- 考察点：状态机设计
- 答题要点：
  - 结束：生成杯测报告落库 + endSession 清理 Redis
  - 取消：放弃会话、不生成报告不落库、重置前端会话 + endSession 清理 Redis
  - 两种终态都主动清理短期记忆，避免串场

---

## 三、创新点方向

### Q17. 市面上 AI 面试产品不少，JavaCafe 的差异化在哪？

- 答题要点：
  - 咖啡文化 × 面试的完整产品叙事，降低心理门槛
  - "四杯咖啡 = 四种面试模式"的可记忆心智模型
  - 不是单点功能，而是"练 → 评 → 回溯 → 成长"闭环

### Q18. 四层记忆机制里，哪一层是你们最独创的设计？

- 答题要点：
  - 单层都不稀奇，层间联动是亮点：
  - 短期 Redis（滑动过期 + 主动清理）+ 长期 pgvector（用户画像注入 Prompt 指导出题）+ RAG 知识库（仅拿铁模式、source 隔离）
  - 组合实现"越练越懂你"

### Q19. SSE 刷新续传这个能力，解决了什么真实痛点？

- 答题要点：
  - 传统 SSE 在 AI 回答中刷新/断网，半截消息必丢
  - replay + 序号去重让"连接语义"不中断
  - 是真实可感知的体验差异，也是工程深度的体现

### Q20. 杯测报告里的 9 维能力雷达图是怎么画出来的？

- 答题要点：
  - SVG 自绘，无三方图表库（polygon + 网格 + 渐变填充）
  - 数据来自 ReportGeneratorTool 的 JSON 结构化输出
  - 报告、雷达图、能力图谱共用同一数据模型

### Q21. 历史报告"按分数排序 + 对话回溯"背后的数据链路？

- 答题要点：
  - 报告落库 PostgreSQL → 前端 fetchHistory 拉取合并
  - 展示层降序排序（不动 store 的"最新在前"语义）
  - 回溯时按 sessionId 查询完整对话记录

### Q22. 拿铁模式升级为 8 大方向八股文 + RAG 知识库，这个组合的设计思路？

- 答题要点：
  - 八股文是"标准答案"型知识，最适合 RAG 提供依据
  - 8 大方向（Java 基础 / JVM / 并发 / Spring / MySQL / Redis / 网络 / OS）覆盖主流面试范围
  - 答题可溯源是差异化点

---

## 四、连环追问（最刁钻）

1. **"replay().limit(1000) 会不会内存泄漏？"**
   → 会话结束时 sink complete + sessions.remove；1000 条/会话有上限，单实例可控

2. **"多标签页刷新，lastSeq 谁写对？"**
   → 最后写入者胜，极端并发可能丢一两个事件，可接受；已列为优化项

3. **"AI 评分会不会不准？"**
   → 报告由 LLM 生成 + 提示词约束 JSON 结构，本质是主观评估；定位是"练习反馈"而非"招聘裁决"；能力图谱强调趋势而非单次绝对值

4. **"DeepSeek 流式输出断了怎么办？"**
   → SseClient 最多 3 次重连 + 后端 replay 重放，断连期间事件不丢

5. **"为什么知识库只给拿铁模式用？"**
   → 美式（系统设计）偏开放题、手冲（项目深挖）依赖个人经历，检索式答案反而干扰；拿铁（八股文）最契合固定答案检索

---

## 演练建议

- 先自己口头答一遍（不看要点），再对照查漏
- 重点练：Q10（架构边界诚实回答）、Q11（SSE 机制讲透）、Q14（响应式细节）
- 连环追问建议两人互练：一人扮演评委追问，一人在 30 秒内作答





长期记忆：

pgvector 向量库存语义信息，供后续相似度检索；interview_records 关系表存结构化记录，供存在性判断和报告生成。下次面试启动时，先查关系表判断用户有没有历史——没有就直接跳过，避免无谓的向量检索；有就按当前面试主题做 Top-K 相似度检索，用 filterExpression 按 userId 过滤保证用户间隔离，把命中记录拼装成'历史面试记忆'注入 Prompt。
