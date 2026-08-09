# 知识库目录（Knowledge Base）

本目录用于存放**预置外部知识文档**，供"拿铁 Latte"（各类八股文）模式 RAG 检索使用。

## 使用方式

1. 将知识文档放入本目录，支持 `.md` 与 `.txt` 两种格式，可建子目录组织。
2. 重启后端服务，启动时自动完成：切分 → 向量化 → 入库 pgvector。
3. 面试时，拿铁模式会按当前问题检索最相关的知识分块注入提示词，作为出题与评估参考。

## 当前覆盖方向（各类八股文）

- Java 语言基础（String、面向对象、泛型、反射、异常、序列化）—— java-basics.md
- Java 集合框架（ArrayList/HashMap/并发集合等）—— java-collections.md
- JVM 原理（内存模型、GC、类加载）—— java-jvm.md
- 并发编程（线程池、锁、AQS、synchronized、volatile）—— java-concurrency.md
- Spring 框架（IoC、AOP、事务、Bean 生命周期、Boot 自动配置）—— java-spring.md
- 数据库（MySQL 索引、事务隔离、MVCC、锁、SQL 优化）—— database-mysql.md
- 中间件（Redis 持久化、缓存三大问题、分布式锁、集群）—— middleware-redis.md
- 计算机网络（TCP 三次握手/四次挥手、HTTP 演进、HTTPS、状态码）—— computer-network.md
- 操作系统（进程线程、死锁、内存管理、IO 多路复用）—— operating-system.md

## 隔离与清理说明

- 知识库文档通过 metadata `source = "knowledge"` 标记，与用户面试记忆（按 userId 过滤）相互隔离，互不干扰。
- 每次启动会清空旧的知识向量后全量重建，因此修改文档内容后重启即可生效，无需手动清理。

## 注意

- 请勿在本目录放置简历、报告等隐私文件——它们会被当作知识文档索引。
- 目录不存在或为空时，应用正常启动，只是拿铁模式的知识上下文为空。
- 新增文档后需重启后端才会被索引（启动时全量重建）。
