# Java 语言基础八股文

## String 相关

### String / StringBuilder / StringBuffer 区别

- String 不可变（final char[] / byte[]，JDK 9 起用 byte[] + coder 做 Latin-1 压缩），拼接会产生新对象。
- StringBuilder 线程不安全、效率高；StringBuffer 方法加 synchronized、线程安全、效率低。
- 单线程拼接用 StringBuilder，多线程共享可变字符串用 StringBuffer。

### String 常量池与 intern

- 字面量在编译期进入常量池（JDK 7 起移到堆）；new String("a") 会在堆上创建新对象，常量池中已有字面量。
- intern()：若常量池已有内容相同的字符串则返回池中引用，否则将当前字符串放入池中（JDK 7 后放引用）。

### == 与 equals

- == 比较引用地址；equals 默认也是地址，String 重写为逐字符比较。
- hashCode 与 equals 约定：equals 相等则 hashCode 必须相等；重写 equals 必须重写 hashCode，否则 HashMap 等集合失效。

## 面向对象

- 三大特性：封装（隐藏细节）、继承（复用）、多态（运行时绑定，依赖方法重写与父类引用）。
- 重载（Overload）：同名不同参，编译期决定；重写（Override）：父子类同签名，运行期决定。
- 接口与抽象类：接口强调能力约定（可多实现、默认方法、静态方法），抽象类强调血缘复用（单继承、可含状态与构造器）。
- final：类不可继承、方法不可重写、变量不可变（引用不可变，对象内容可变）。

## 泛型与类型擦除

- 泛型只在编译期生效，运行时擦除为原始类型（List<String> → List），配合类型转换检查。
- 通配符：? extends T（上界，只读）、? super T（下界，只写）。
- 泛型不可用基本类型、不可 new T()、不可创建泛型数组（可用 ArrayList 替代）。

## 反射

- 运行时获取类的构造器、方法、字段并调用，是 Spring IoC/AOP、动态代理、框架底层的基础。
- 入口：Class.forName / 类.class / 实例.getClass()。
- 性能开销大（安全检查、动态分派），高频场景避免滥用；JDK 9 起模块化限制反射访问。

## 注解

- 元注解：@Target（作用位置）、@Retention（生命周期 SOURCE/CLASS/RUNTIME）、@Inherited、@Documented。
- 运行时注解（@Retention(RUNTIME)）才能被反射读取，是 Spring 注解驱动的基础。

## 异常体系

- Throwable → Error（不可恢复，如 OOM、StackOverflow）与 Exception。
- Exception → 受检异常（编译期强制处理，如 IOException）与运行时异常 RuntimeException（不强制，如 NPE、IllegalArgumentException）。
- try-with-resources：自动关闭实现 AutoCloseable 的资源；finally 中 return 会覆盖 try 的 return（避免在 finally 写 return）。
- 捕获顺序：先子类后父类，否则子类异常永远捕获不到（编译报错）。

## 序列化

- Serializable 是标记接口，serialVersionUID 用于版本校验（不声明则按类结构生成，类变更后反序列化可能抛 InvalidClassException）。
- transient 修饰的字段不参与序列化；static 字段也不序列化。
- 序列化破坏单例：readResolve() 可保证反序列化后仍返回单例。
