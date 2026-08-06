# Java 并发编程面试知识

## 线程基础

### 线程创建方式

四种：继承 Thread、实现 Runnable、实现 Callable（有返回值、可抛异常）、线程池 ExecutorService。推荐使用 Runnable/Callable 与线程池，避免继承带来的单继承限制与资源浪费。

### 线程状态

NEW（新建）、RUNNABLE（可运行，包含就绪与运行）、BLOCKED（阻塞，等待监视器锁）、WAITING（无限等待）、TIMED_WAITING（限时等待）、TERMINATED（终止）。

状态转换要点：sleep 不释放锁，wait 释放锁；wait/notify 必须在 synchronized 块中使用；join 让当前线程等待目标线程结束。

### sleep 与 wait 区别

- sleep 是 Thread 静态方法，wait 是 Object 实例方法。
- sleep 不释放锁，wait 释放锁并进入等待队列。
- sleep 到时间自动唤醒，wait 需要 notify/notifyAll 或超时唤醒。
- wait 必须在同步块中使用，sleep 不需要。

## 并发三大特性

1. 原子性：一个或多个操作要么全部执行要么全部不执行。保证手段：synchronized、Lock、CAS、原子类。
2. 可见性：一个线程修改共享变量后，其他线程能立即看到。保证手段：volatile、synchronized、Lock、final。
3. 有序性：程序执行顺序与代码顺序一致，防止指令重排。保证手段：volatile（禁重排）、synchronized、happens-before 规则。

## volatile 关键字

- 保证可见性：写 volatile 变量后立即刷新到主内存，读时从主内存获取。
- 禁止指令重排序：通过内存屏障实现。
- 不保证原子性：i++ 这类复合操作仍需加锁或用 AtomicInteger。
- 经典应用：双重检查锁单例（DCL）中 instance 用 volatile 修饰，防止半初始化对象被发布。

## synchronized 关键字

### 使用方式

- 修饰实例方法：锁当前对象 this。
- 修饰静态方法：锁类对象 Class。
- 修饰代码块：锁指定对象。

### 锁升级过程

无锁 → 偏向锁 → 轻量级锁 → 重量级锁（JDK 15 默认禁用偏向锁，JDK 15+ 已移除偏向锁优化）。

- 偏向锁：只有一个线程访问时，记录线程 ID，避免 CAS 开销。
- 轻量级锁：多线程交替访问时，用 CAS 自旋尝试获取锁。
- 重量级锁：竞争激烈时升级，依赖操作系统互斥量，线程阻塞挂起。

### 底层原理

基于对象头 Mark Word 与监视器 Monitor。重量级锁依赖 ObjectMonitor，包含 EntryList（等待进入）、WaitSet（wait 后等待唤醒）、Owner（持锁线程）。

### ReentrantLock 与 synchronized 区别

- synchronized 自动释放锁（异常时也释放），ReentrantLock 需手动 unlock，通常配合 try-finally。
- ReentrantLock 支持公平锁、可中断、可超时、多条件 Condition。
- synchronized 是 JVM 内置，锁升级优化；ReentrantLock 是 JUC 类库。
- 性能上现代 JVM 两者差距很小，无竞争时 synchronized 更优。

## Lock 接口与 AQS

### AQS 原理

AbstractQueuedSynchronizer 是 JUC 锁与同步器的基石，维护一个 volatile int state 与 FIFO 等待队列（CLH 变体）。

- 独占模式：acquire（tryAcquire + 失败入队阻塞）与 release（tryRelease + 唤醒后继）。
- 共享模式：acquireShared/releaseShared（如 Semaphore、CountDownLatch）。
- 子类只需实现 tryAcquire/tryRelease 或 tryAcquireShared/tryReleaseShared，通过 CAS 修改 state。

### 常用同步工具

- CountDownLatch：计数器递减，countDown 到 0 时 await 线程放行，一次性。
- CyclicBarrier：栅栏，N 个线程到达后一起放行，可复用。
- Semaphore：信号量，控制并发访问数量，acquire/release。
- ReentrantReadWriteLock：读写锁，读读共享、读写互斥、写写互斥。
- StampedLock：JDK 8 新增，支持乐观读，读多写少场景性能更好。

## CAS 与原子类

### CAS 原理

Compare And Swap，比较内存值 V 与预期值 A，相等则更新为 B，否则重试。底层依赖处理器 cmpxchg 指令。

### 问题

- ABA 问题：加版本号解决，AtomicStampedReference。
- 自旋开销：竞争激烈时循环重试消耗 CPU。
- 只能保证单个变量原子操作。

### 常用原子类

AtomicInteger、AtomicLong、AtomicBoolean、AtomicReference、LongAdder（高并发计数推荐，分段累加减少竞争）。

## ThreadLocal

- 每个线程持有 ThreadLocalMap，key 为 ThreadLocal 弱引用，value 为强引用。
- 内存泄漏风险：key 弱引用被回收后 value 无法访问，需在线程池场景用完 remove()。
- 典型应用：Spring 事务管理、SimpleDateFormat 线程安全化、请求上下文传递。

## 线程池

### 核心参数

- corePoolSize：核心线程数。
- maximumPoolSize：最大线程数。
- keepAliveTime：非核心线程空闲存活时间。
- workQueue：任务队列（ArrayBlockingQueue、LinkedBlockingQueue、SynchronousQueue）。
- threadFactory：线程工厂（可设置线程名、守护线程）。
- handler：拒绝策略（AbortPolicy 抛异常、CallerRunsPolicy 调用者执行、DiscardPolicy 丢弃、DiscardOldestPolicy 丢弃最旧）。

### 执行流程

核心线程未满 → 创建核心线程执行；队列未满 → 入队等待；队列已满且未达最大线程 → 创建非核心线程；都满了 → 执行拒绝策略。

### 为什么不用 Executors 快捷方法

Executors.newFixedThreadPool 使用无界 LinkedBlockingQueue，任务堆积可能 OOM；newCachedThreadPool 最大线程数为 Integer.MAX_VALUE，线程过多可能 OOM。生产建议手动 new ThreadPoolExecutor，明确参数。

### 合理设置线程数

- CPU 密集型：CPU 核数 + 1。
- IO 密集型：CPU 核数 * 2，或 CPU 核数 / (1 - 阻塞系数)。
- 通用公式：Nthreads = Ncpu * Ucpu * (1 + W/C)，W 为等待时间，C 为计算时间。

### 关闭线程池

shutdown：不再接收新任务，执行完队列任务后关闭；shutdownNow：立即中断所有任务并返回未执行任务列表。

## 常见并发面试问题速记

1. 两个线程交替打印 1-100：synchronized + wait/notify，或 Lock + Condition。
2. 死锁产生的四个条件：互斥、占有并等待、不可剥夺、循环等待；破坏任意一个即可避免。
3. happens-before 规则：程序次序规则、监视器锁规则、volatile 变量规则、传递性等八条。
4. 为什么 wait/notify 必须配合 synchronized：保证线程安全与防止 Lost Wake-up。
5. ForkJoinPool：分治思想，工作窃取算法，任务拆分合并。
6. 虚拟线程（JDK 21）：轻量级线程，百万级线程场景替代线程池，阻塞不占用平台线程。
