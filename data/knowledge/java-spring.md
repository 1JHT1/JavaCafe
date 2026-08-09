# Spring 框架八股文

## IoC 与 DI

- IoC（控制反转）：对象的创建与依赖组装交给容器，而非对象自己 new；DI 是其实现方式（构造器注入 / setter 注入 / 字段注入）。
- 推荐构造器注入：依赖不可变、显式、便于测试；字段注入不利于单元测试与循环依赖排查。
- Bean 的装配：@Component 族注解扫描 + @Configuration + @Bean；依赖查找 getBean 不推荐。

## Bean 生命周期

1. 实例化（构造器）
2. 属性填充（依赖注入）
3. Aware 回调：BeanNameAware、BeanFactoryAware、ApplicationContextAware
4. BeanPostProcessor#postProcessBeforeInitialization
5. 初始化：@PostConstruct → InitializingBean#afterPropertiesSet → 自定义 init-method
6. BeanPostProcessor#postProcessAfterInitialization（AOP 代理在此生成）
7. 使用
8. 销毁：@PreDestroy → DisposableBean#destroy

## Bean 作用域

- singleton（默认，容器级单例）、prototype（每次 getBean 新建）、request/session/application（Web 场景）。
- 注意：单例 Bean 注入原型 Bean 时，注入的是同一个实例——需要原型依赖时用 ObjectProvider 或 @Lookup 或 ScopedProxyMode。

## AOP 原理

- 切面（Aspect）、切点（Pointcut）、通知（Advice：Before/After/AfterReturning/AfterThrowing/Around）。
- 实现：目标类实现接口用 JDK 动态代理（基于接口，Proxy.newProxyInstance），否则用 CGLIB 子类代理。
- Spring Boot 2.x 起默认 CGLIB（proxyTargetClass=true），即使有接口也走子类代理。
- 失效场景：同类内部方法自调用不走代理；private/final/static 方法不可代理；直接 new 的对象不经过容器。

## Spring 事务

- @Transactional 基于 AOP 代理实现，默认只在 RuntimeException 时回滚，受检异常不回滚（需 rollbackFor = Exception.class）。
- 失效场景：自调用（this.method()）、方法非 public、异常被 catch 吞掉、类未被 Spring 管理、传播行为设为 NOT_SUPPORTED 等。
- 隔离级别：DEFAULT / READ_UNCOMMITTED / READ_COMMITTED / REPEATABLE_READ / SERIALIZABLE。
- 传播行为：REQUIRED（默认，有则加入无则新建）、REQUIRES_NEW（挂起当前新建）、NESTED（嵌套，Savepoint 部分回滚）等。

## 循环依赖与三级缓存

- 默认 singleton 下支持构造器注入外的循环依赖：三级缓存（一级 singletonObjects 成品、二级 earlySingletonObjects 半成品、三级 singletonFactories 提前引用工厂）。
- 解决原理：实例化 A 后把工厂放入三级缓存，A 注入 B 时 B 又引用 A，从三级缓存取 A 的提前引用注入。
- 构造器循环依赖无法解决（实例化都未完成），需 @Lazy 打破。

## Spring Boot 自动配置

- @SpringBootApplication = @Configuration + @EnableAutoConfiguration + @ComponentScan。
- 自动配置原理：@EnableAutoConfiguration 通过 SpringFactoriesLoader 加载 META-INF/spring.factories（新版 spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports）中的自动配置类，按 @Conditional 条件（如 @ConditionalOnClass、@ConditionalOnMissingBean、@ConditionalOnProperty）按需生效。
- 用户自定义 @Bean 优先级高于自动配置（@ConditionalOnMissingBean 兜底）。

## Spring MVC 请求流程

DispatcherServlet → HandlerMapping 找 Handler（Controller 方法）→ HandlerAdapter 执行 → 参数解析（@RequestBody 走 HttpMessageConverter）→ 拦截器 → 返回 ModelAndView / @ResponseBody 序列化 → 异常由 @ControllerAdvice 处理。
