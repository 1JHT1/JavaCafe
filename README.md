# ☕ JavaCafe（咖面）

> **用一杯咖啡的时间，搞定一场 Java 面试。**

JavaCafe 是一款 **AI 驱动的 Java 面试模拟与辅导工具**。以"咖啡馆"为主题，提供多种面试模式（拿铁、手冲、美式、当季特调），通过 AI 面试官实时提问、评估回答、生成详细面试报告，帮助开发者高效备战 Java 技术面试。

---

## 技术栈

### 后端
| 技术 | 版本 / 说明 |
|---|---|
| Java | 21 |
| Spring Boot | 3.3.2 (WebFlux 响应式) |
| Spring AI | 1.0.0-M5 |
| LLM 模型 | DeepSeek (deepseek-v4-flash) |
| Embedding 模型 | 本地 ONNX all-MiniLM-L6-v2 |
| 数据库 | PostgreSQL + pgvector 向量扩展 |
| 缓存 | Redis |
| 安全 | Spring Security + 手写 JWT (HS256) + BCrypt |
| 文档解析 | Apache Tika 2.9.2 |
| 构建工具 | Maven (多模块) |

### 前端
| 技术 | 版本 / 说明 |
|---|---|
| TypeScript | 5.5 |
| React | 18.3 |
| React Router | 6.26 |
| Vite | 5.3 |
| Tailwind CSS | 3.4 (自定义咖啡主题色) |
| Zustand | 4.5 (状态管理) |
| Framer Motion | 11.3 (动画) |
| Lucide React | 0.419 (图标) |

---

## 项目结构

```
JavaCafe/
├── backend/                              # Maven 多模块后端
│   ├── pom.xml                           # 父 POM
│   ├── javacafe-common/                  # 公共模块：工具类、异常、常量
│   ├── javacafe-api/                     # API 契约模块：DTO 定义
│   ├── javacafe-infrastructure/          # 基础设施层：JPA 实体、Repository、Redis、pgvector
│   ├── javacafe-core/                    # 核心业务层：AI Agent、面试流程、工具、Prompt
│   └── javacafe-web/                     # Web 入口：Controller、Security、SSE、启动类
├── frontend/                             # React + TypeScript + Vite 前端
│   └── src/
│       ├── api/                          # API 客户端层
│       ├── stores/                       # Zustand 状态管理
│       ├── pages/                        # 页面组件
│       ├── components/                   # UI 组件
│       │   ├── coffee/                   # 咖啡主题组件
│       │   ├── common/                   # 通用组件
│       │   ├── interview/                # 面试相关组件
│       │   ├── layout/                   # 布局组件
│       │   ├── menu/                     # 菜单组件
│       │   └── report/                   # 报告组件
│       ├── hooks/                        # 自定义 Hooks
│       ├── types/                        # 类型定义
│       └── utils/                        # 工具函数
├── data/                                 # 运行时数据目录
│   ├── knowledge/                        # 知识库 Markdown 文件（10 个文件，涵盖 8 大领域）
│   ├── onnx/                             # 本地 Embedding 模型文件
│   └── resumes/                          # 上传的简历文件
├── download-embedding-model.ps1          # ONNX 模型下载脚本
└── README.md
```

---

## 功能特性

### 四种面试模式（咖啡菜单）

| 模式 | 中文名 | 说明 |
|---|---|---|
| **Latte** 拿铁 | 八股文 | Java 基础、JVM、并发、Spring、MySQL、Redis、网络、操作系统等经典面试题 |
| **Pour-over** 手冲 | 项目深挖 | 基于上传的简历，深度挖掘项目经历，采用状态机工作流评估回答深度 |
| **Americano** 美式 | 系统设计 | 架构设计与系统设计题，配有专用系统设计评估工具 |
| **Special** 当季特调 | 综合模拟 | 随机切换各类题型，模拟真实不可预测的面试场景 |

### 核心功能

- **AI 实时面试** — AI 咖啡师通过 SSE 实时流式提问与评估，动态调整题目难度
- **简历解析** — 上传简历后自动解析（Apache Tika），手冲模式基于简历内容深度提问
- **RAG 知识检索** — 双层向量检索：用户长期记忆（避免重复出题）+ 预置知识库（八股文领域知识）
- **面试报告（杯测笔记）** — AI 生成结构化 JSON 报告：评分（0-100）、优势、不足及改进建议
- **用户认证** — 注册/登录，JWT Token 鉴权（24h 过期），支持匿名"软认证"
- **用户画像** — 存储目标岗位、经验水平、优劣势，AI 据此定制题目并自动更新画像
- **每日打卡** — LeetCode 风格热力图，记录每日面试练习连续打卡
- **历史回放** — 历史面试记录持久化存储，支持查看完整对话与下载 Markdown 报告

### 页面路由

| 路由 | 页面 |
|---|---|
| `/` | 首页 — Hero、每日打卡、咖啡菜单 |
| `/interview/:mode` | 面试会话（实时对话界面） |
| `/report/:sessionId` | 面试报告（评分、雷达图、强弱项） |
| `/history` | 历史记录列表 |
| `/profile` | 用户画像编辑 |
| `/auth` | 登录 / 注册 |
| `*` | 404 |

---

## 环境要求

- **JDK** 21+
- **Maven** 3.x
- **Node.js** 18+ 和 npm
- **PostgreSQL** 15+（需安装 `pgvector` 扩展）
- **Redis** 7+
- **DeepSeek API Key**（[获取地址](https://platform.deepseek.com/)）

---

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd JavaCafe
```

### 2. 下载 Embedding 模型

项目使用本地 ONNX 模型进行文本向量化，需要先下载模型文件：

```powershell
# Windows PowerShell
.\download-embedding-model.ps1
```

脚本会从 hf-mirror.com 下载 `model.onnx`（约 90MB）和 `tokenizer.json` 到 `data/onnx/` 目录。

### 3. 准备数据库

确保 PostgreSQL 已安装 `pgvector` 扩展，然后创建数据库：

```sql
CREATE DATABASE javacafe;
```

首次启动时，后端会自动创建表结构和初始化 pgvector 向量表。

### 4. 配置环境变量

```bash
# DeepSeek API Key（必填）
export LLM_API_KEY=sk-your-deepseek-api-key

# 数据库密码（选填，默认 postgres）
export DB_PASSWORD=your-db-password

# Redis 密码（选填，默认 123456）
export REDIS_PASSWORD=your-redis-password
```

或者创建 `backend/javacafe-web/src/main/resources/application-local.yml` 配置文件（已在 `.gitignore` 中排除）：

```yaml
spring:
  ai:
    openai:
      api-key: sk-your-actual-api-key
  datasource:
    password: your-db-password
  data:
    redis:
      password: your-redis-password
```

### 5. 启动后端

```bash
cd backend
mvn spring-boot:run -pl javacafe-web
```

后端默认运行在 **http://localhost:8080**。

首次启动时会自动：
- 创建数据库表（JPA `ddl-auto: update`）
- 读取 `data/knowledge/` 下的知识文件，切片并向量化写入 pgvector
- 初始化 pgvector 扩展和向量表结构

### 6. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端开发服务器运行在 **http://localhost:5173**，API 请求自动代理到后端 `:8080`。

### 7. 访问应用

打开浏览器访问 **http://localhost:5173**，即可开始使用。

---

## 生产构建

```bash
# 前端构建
cd frontend && npm run build    # 输出到 frontend/dist/

# 后端构建
cd backend && mvn clean package -DskipTests
# JAR 包位于 javacafe-web/target/javacafe-web-1.0.0-SNAPSHOT.jar

# 运行
java -jar javacafe-web/target/javacafe-web-1.0.0-SNAPSHOT.jar
```

---

## 配置说明

主要配置项位于 `backend/javacafe-web/src/main/resources/application.yml`：

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `server.port` | `8080` | 后端服务端口 |
| `spring.datasource.url` | `jdbc:postgresql://localhost:5432/javacafe` | 数据库连接 |
| `spring.datasource.username` | `postgres` | 数据库用户名 |
| `spring.data.redis.host` | `localhost` | Redis 地址 |
| `spring.data.redis.port` | `6379` | Redis 端口 |
| `spring.ai.openai.base-url` | `https://api.deepseek.com` | LLM API 地址 |
| `spring.ai.openai.chat.options.model` | `deepseek-v4-flash` | LLM 模型名 |
| `spring.ai.vectorstore.pgvector.initialize-schema` | `true` | 首次启动自动初始化向量表 |
| `javacafe.embedding.model-path` | `../data/onnx/model.onnx` | Embedding 模型路径 |
| `javacafe.knowledge.base-path` | `../data/knowledge` | 知识库文件目录 |
| `javacafe.knowledge.top-k` | `5` | 向量检索返回数量 |

---

## 架构概览

```
┌─────────────┐     SSE 流式推送     ┌──────────────────────────────────┐
│   前端 SPA   │ ◄──────────────────► │          javacafe-web            │
│  React 18    │     HTTP REST        │  Controller / Security / SSE     │
│  Vite + TW   │                      └────────────┬─────────────────────┘
└─────────────┘                                    │
                                                   ▼
                  ┌─────────────────────────────────────────────────────┐
                  │                    javacafe-core                     │
                  │  InterviewAgent   WorkflowOrchestrator   Tools      │
                  │  PromptLoader     StateGraphBuilder                 │
                  └──────┬───────────────────────────────┬──────────────┘
                         │                               │
                         ▼                               ▼
          ┌──────────────────────┐        ┌──────────────────────────┐
          │ javacafe-infrastructure│        │    外部 AI 服务           │
          │  JPA Repository       │        │  DeepSeek Chat API       │
          │  Redis (短期记忆)      │        │  本地 ONNX Embedding      │
          │  pgvector (长期记忆)   │        └──────────────────────────┘
          │  KnowledgeBase       │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │   PostgreSQL + pgvector│
          │   Redis               │
          └──────────────────────┘
```

- **短期记忆**：Redis 存储会话中最近的对话消息，提供上下文连贯性
- **长期记忆**：pgvector 存储问答对的向量嵌入，按用户 ID 隔离，用于跨会话检索，避免重复出题
- **知识库**：10 个 Markdown 文件覆盖 Java 面试常见领域，向量化后存入 pgvector（`source = "knowledge"`），RAG 检索增强回答

---

## API 接口概览

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/interview/latte` | 开始拿铁面试（SSE） |
| GET | `/api/interview/pour-over` | 开始手冲面试（SSE） |
| GET | `/api/interview/americano` | 开始美式面试（SSE） |
| GET | `/api/interview/special` | 开始特调面试（SSE） |
| POST | `/api/interview/answer` | 提交回答 |
| POST | `/api/interview/end/{sessionId}` | 结束面试，生成报告 |
| POST | `/api/resume/upload` | 上传简历 |
| GET | `/api/history` | 获取面试历史列表 |
| GET | `/api/history/{sessionId}` | 获取面试详情与报告 |
| GET | `/api/profile` | 获取用户画像 |
| PUT | `/api/profile` | 更新用户画像 |
| POST | `/api/checkin` | 每日打卡 |

---

## 知识库内容

| 文件 | 覆盖领域 |
|---|---|
| `java-basics.md` | Java 基础 |
| `java-collections.md` | Java 集合框架 |
| `java-jvm.md` | JVM 原理与调优 |
| `java-concurrency.md` | Java 并发编程 |
| `java-spring.md` | Spring 框架 |
| `database-mysql.md` | MySQL 数据库 |
| `middleware-redis.md` | Redis 中间件 |
| `computer-network.md` | 计算机网络 |
| `operating-system.md` | 操作系统 |

首次启动时自动向量化索引，后续可通过重新放入文件并重启后端来更新知识库。
