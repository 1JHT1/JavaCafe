# MySQL 数据库八股文

## 索引

### B+ 树索引

- InnoDB 用 B+ 树：非叶子节点只存索引键（扇出大、树矮、磁盘 IO 少），叶子节点存数据并双向链表相连，天然支持范围查询。
- 聚簇索引（主键索引）：叶子节点存整行数据；二级索引（普通索引）：叶子节点存主键值，查询需回表。
- 覆盖索引：查询列都在二级索引中，无需回表（Using index）。
- 索引失效场景：最左前缀不满足、对索引列使用函数/运算、隐式类型转换、like 以 % 开头、or 连接非索引列、使用 != 或 not in（优化器可能放弃）。

### 最左前缀原则

联合索引 (a, b, c) 可命中 a、a,b、a,b,c；跳过 a 直接 b 或 c 无法使用索引。范围查询后面的列索引失效（5.6 后部分下推）。

### 回表、索引下推（ICP）

- 回表：二级索引查到主键后回主键索引取整行数据。
- 索引下推：5.6 起把对索引列的过滤条件下推到存储引擎层，减少回表次数。

## 事务与 ACID

- 原子性（undo log 回滚）、一致性、隔离性（MVCC + 锁）、持久性（redo log + binlog）。
- redo log：崩溃恢复（WAL 先写日志后落盘）；undo log：回滚与 MVCC 版本链；binlog：归档/主从复制（逻辑日志）。
- 两阶段提交：redo log prepare → binlog → redo log commit，保证 redo 与 binlog 一致。

## 隔离级别与 MVCC

- READ UNCOMMITTED（脏读）、READ COMMITTED（不可重复读）、REPEATABLE READ（默认，可重复读）、SERIALIZABLE。
- 不可重复读：同一事务两次读同一条记录结果不同（其他事务更新并提交）；幻读：范围查询两次结果集行数不同（其他事务插入）。
- MVCC：版本链（undo log）+ ReadView（活跃事务列表）。RC 每语句生成 ReadView，RR 事务首次快照生成后复用，实现快照读的隔离。
- RR 下幻读：快照读不产生幻读；当前读（for update）需 next-key lock 解决。

## 锁

- 行锁：共享锁（S）/排他锁（X），加在索引记录上（锁不到索引则升级表锁/全表扫描）。
- 记录锁（Record Lock）、间隙锁（Gap Lock，RR 下用于防幻读）、临键锁（Next-Key Lock = 记录锁 + 前开区间间隙锁）。
- 意向锁：表级，标记事务准备对行加锁，避免逐行检查。
- 死锁：多个事务互等对方资源，InnoDB 检测到后回滚代价较小的事务；避免按固定顺序加锁、控制事务大小。

## SQL 优化

- EXPLAIN 关键列：type（system > const > eq_ref > ref > range > index > ALL）、key（实际用的索引）、rows（预估行数）、Extra（Using index / Using filesort / Using temporary / Using where）。
- 避免 select *、避免大事务、避免全表扫描；分页深翻页优化：延迟关联（先查主键再回表）。
- 慢查询：slow_query_log 开启，配合 mysqldumpslow 分析；大表加列/改列可用 pt-osc 在线 DDL。

## 主从复制

- 异步复制：主库写 binlog，从库 IO 线程拉取写入 relay log，SQL 线程重放；半同步复制保证至少一个从库确认。
- 主从延迟应对：强制走主库、缓存兜底、半同步、并行复制。
