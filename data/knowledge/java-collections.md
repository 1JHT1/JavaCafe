# Java 集合框架面试知识

## 集合体系结构

Java 集合框架两大体系：Collection（单列）与 Map（键值对）。

- Collection 下分 List（有序可重复）、Set（无序不可重复）、Queue（队列）。
- List 实现类：ArrayList、LinkedList、Vector（Stack）。
- Set 实现类：HashSet、LinkedHashSet、TreeSet。
- Map 实现类：HashMap、LinkedHashMap、TreeMap、Hashtable、ConcurrentHashMap。

## ArrayList 与 LinkedList

### ArrayList

- 基于动态数组，底层 Object[]。
- 查询快（O(1) 随机访问），增删慢（需移动元素，O(n)）。
- 初始容量 10，扩容 1.5 倍（int newCapacity = oldCapacity + (oldCapacity >> 1)），通过 Arrays.copyOf 复制。
- 线程不安全，可用 Collections.synchronizedList 或 CopyOnWriteArrayList。

### LinkedList

- 基于双向链表（JDK 8 之前是循环链表）。
- 增删快（头尾 O(1)，中间 O(n)），查询慢（O(n)）。
- 同时实现 List 与 Deque，可作队列/双端队列/栈使用。
- 线程不安全。

### ArrayList 扩容细节

add 时先确保容量，minCapacity > elementData.length 则扩容。扩容后容量为旧容量 1.5 倍，若仍小于 minCapacity 则取 minCapacity。扩容涉及数组复制，频繁扩容影响性能，可预估容量传入构造器。

## HashMap

### 底层结构

JDK 8 起为数组 + 链表 + 红黑树。数组默认容量 16，负载因子 0.75，链表长度超过 8 且数组长度达到 64 时树化为红黑树；红黑树节点数小于 6 时退化为链表。

### put 流程

1. 计算 key 的 hash：h = key.hashCode()，再 h ^ (h >>> 16) 扰动，降低哈希冲突。
2. 数组为空则 resize 初始化。
3. 定位桶位 index = (n - 1) & hash。
4. 桶为空直接放入；不为空则比较 hash 与 equals，相同则覆盖。
5. 桶为链表则尾插（JDK 8 改为尾插避免环形链表），超过树化阈值转红黑树。
6. 元素数量超过阈值（容量 * 负载因子）则扩容。

### 扩容机制

容量翻倍，元素重新计算桶位。JDK 8 优化：根据 (e.hash & oldCap) 是否为 0 分为低位链表与高位链表，高位链表整体移动到 index + oldCap 位置，避免每次 rehash。

### 为什么容量是 2 的幂

使用 (n - 1) & hash 代替取模运算，效率更高；2 的幂保证 n-1 低位全 1，哈希分布更均匀。

### HashMap 线程安全问题

JDK 7 头插法并发扩容可能形成环形链表导致死循环；JDK 8 尾插法无死循环但仍有数据覆盖问题。并发场景使用 ConcurrentHashMap。

### 自定义对象作为 key 的要求

必须重写 hashCode 与 equals，且 equals 相等的对象 hashCode 必须相等（反之不要求）。若 key 为可变对象且修改了参与 hashCode 的字段，将导致无法查找。

## ConcurrentHashMap

### JDK 7 实现

分段锁 Segment（继承 ReentrantLock），默认 16 段，每段一个 HashEntry 数组，并发度 16。

### JDK 8 实现

放弃分段锁，采用 CAS + synchronized 锁头节点。

- put：桶位为空用 CAS 插入；不为空 synchronized 锁住链表/红黑树头节点后插入。
- get：无锁，Node 的 value 与 next 用 volatile 修饰，保证可见性。
- 扩容：多线程协助迁移，ForwardingNode 标记已迁移桶位。
- size：baseCount 与 CounterCell 分段计数，避免 CAS 竞争。

### JDK 8 与 JDK 7 对比

锁粒度更细（锁头节点而非整段）、get 全程无锁、扩容支持并发协助、内存占用更小。

## LinkedHashMap 与 TreeMap

### LinkedHashMap

继承 HashMap，额外维护双向链表记录插入顺序或访问顺序（accessOrder=true 时 LRU 顺序）。可实现 LRU 缓存（重写 removeEldestEntry）。

### TreeMap

基于红黑树，key 必须可比较（实现 Comparable 或传入 Comparator），保证有序。支持范围查询（subMap、headMap、tailMap）。复杂度 O(log n)。

### HashMap 与 Hashtable 区别

- Hashtable 线程安全（方法级 synchronized），HashMap 线程不安全。
- Hashtable 不允许 null key/value，HashMap 允许一个 null key 与多个 null value。
- Hashtable 容量默认 11，扩容 2 倍 + 1；HashMap 容量 2 的幂，扩容 2 倍。
- 初始容量与哈希算法不同。

## HashSet 与 TreeSet

- HashSet 底层是 HashMap（value 为固定 PRESENT 对象），无序，允许 null，O(1)。
- LinkedHashSet：底层 LinkedHashMap，保持插入顺序。
- TreeSet：底层 TreeMap，按自然顺序或比较器排序，O(log n)。
- 去重依据：hashCode + equals（HashSet）或 compareTo/compare（TreeSet）。

## CopyOnWriteArrayList

- 写时复制：add/set 时复制原数组生成新数组，修改后替换引用，写操作加 ReentrantLock。
- 读不加锁，读的是旧数组快照，弱一致性。
- 适合读多写少场景（如监听器列表），写频繁时复制开销大。
- 迭代器不支持修改操作（remove 抛 UnsupportedOperationException）。

## 阻塞队列 BlockingQueue

- ArrayBlockingQueue：数组有界队列，一把锁两个条件。
- LinkedBlockingQueue：链表，默认无界（可指定容量），两把锁分别控制读写。
- SynchronousQueue：不存储元素，直接传递，吞吐量高。
- PriorityBlockingQueue：支持优先级排序的无界队列。
- DelayQueue：延迟队列，元素到期待取。

## 常见集合面试问题速记

1. 为什么 ArrayList 的 modCount 用于快速失败？迭代中结构性修改抛 ConcurrentModificationException。
2. equals 与 hashCode 的关系：equals 相等则 hashCode 必相等；hashCode 相等 equals 不一定相等（哈希冲突）。
3. HashMap 为什么树化阈值是 8？泊松分布下链表长度达到 8 的概率极低（约千万分之六），兼顾时间与空间。
4. Collections.synchronizedMap 与 ConcurrentHashMap 区别：前者全方法加锁，后者分段/头节点粒度更细，读无锁。
5. 深拷贝与浅拷贝在集合中的体现：clone 是浅拷贝，元素引用共享。
