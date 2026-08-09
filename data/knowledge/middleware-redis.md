# Redis 中间件八股文

## 数据类型与底层结构

- String（SDS 动态字符串）、List（quicklist）、Hash（listpack + hashtable）、Set（intset + hashtable）、ZSet（skiplist + dict）。
- 位图（Bitmap，基于 String）、HyperLogLog（基数统计，12KB 内存误差约 0.81%）、GEO（地理位置，基于 ZSet）。
- 单线程模型：Redis 6 之前纯单线程执行命令（IO 多路复用），6 起引入多线程处理网络 IO，命令执行仍单线程——保证原子性、避免锁竞争。

## 持久化

- RDB：定时全量快照（fork 子进程写临时文件），文件小、恢复快，但可能丢失两次快照间的数据。
- AOF：追加写命令日志（always / everysec / no），数据更安全，文件大、恢复慢；AOF 重写可压缩（子进程 + 写时复制）。
- 混合持久化（4.0+）：AOF 重写时把 RDB 快照作为开头，兼顾恢复速度与数据安全。
- 生产建议：默认开启 AOF everysec，配合 RDB 做备份。

## 过期与淘汰

- 过期删除：惰性删除（访问时检查）+ 定期删除（随机抽查），两者结合避免内存与 CPU 开销失衡。
- 内存淘汰（maxmemory-policy）：noeviction、allkeys-lru / volatile-lru、allkeys-lfu / volatile-lfu、allkeys-random / volatile-random、volatile-ttl。

## 缓存三大问题

- 缓存穿透：查询不存在的数据，绕过缓存直击 DB——布隆过滤器 / 缓存空值（TTL 短）。
- 缓存击穿：热点 key 过期瞬间大量请求打 DB——互斥锁重建缓存 / 逻辑过期 / 热点 key 不过期。
- 缓存雪崩：大量 key 同时过期或 Redis 宕机——过期时间加随机抖动 / 集群高可用 / 多级缓存 / 限流降级。

## 缓存一致性

- 先更新 DB 再删缓存（推荐），删除失败用延迟双删 / 消息队列补偿。
- 读多写少场景可容忍短暂不一致；强一致场景缓存只做读加速并配合版本号校验。

## 分布式锁

- 基础实现：SET key value NX EX（原子设置 + 过期时间），释放用 Lua 脚本比较 value（防误删他人锁）。
- Redisson：看门狗机制默认 30s 续期、可重入、支持红锁（RedLock）多节点仲裁。
- 锁粒度与业务执行时间要匹配，避免锁过期后业务未完成导致并发进入临界区（需续期兜底）。

## 高可用架构

- 主从复制：一主多从，读写分离；全量复制（RDB + buffer）+ 增量复制（repl_backlog）。
- 哨兵（Sentinel）：监控、选主、通知，实现故障自动转移；客户端需集成哨兵地址。
- Cluster：16384 个哈希槽分布式分片，数据按 CRC16(key) % 16384 路由；节点间 gossip 通信，支持在线扩容缩容；多 key 操作需在同一槽（hash tag）。

## 其他高频考点

- 为什么快：纯内存 + 单线程 + IO 多路复用（epoll）+ 高效数据结构。
- 大 key / 热 key：大 key 阻塞命令执行（建议拆分、异步删除 unlink）；热 key 用本地缓存 / 多副本分摊读。
- Pipeline：批量命令一次 RTT 发送，减少网络往返；事务 MULTI/EXEC 保证命令串行执行（无回滚）。
