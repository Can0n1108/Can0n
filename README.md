# Can0n AI - 医疗多智能体分析系统

基于 Google Gemini 的多智能体医疗分析平台，通过多个 AI 智能体协作，提供症状分析、检验解读、治疗建议和风险评估。

## 功能特性

- **多智能体协作分析**：症状分析、检验报告解读、治疗建议、风险评估五个智能体并行工作
- **实时 WebSocket 通信**：分析过程实时推送，进度可见
- **用户系统**：注册 / 登录 / 会话管理
- **分析报告**：结构化报告生成，支持 PDF 导出
- **历史记录**：支持搜索、分页浏览历史分析记录
- **仪表盘**：分析统计概览和最近活动

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18、TypeScript、Vite、TailwindCSS |
| 后端 | Express、TypeScript、WebSocket |
| 数据库 | PostgreSQL (Drizzle ORM) |
| AI | Google Gemini 2.0 Flash |
| 构建 | Vite、tsx |

## 系统架构

```mermaid
graph TB
    subgraph 前端["前端 - React 18"]
        direction TB
        A[LoginPage / RegisterPage]
        B[DashboardPage]
        C[AnalysisPage]
        D[ReportPage]
        E[HistoryPage]
        F[AuthContext / ToastContext]
        G[Layout / ParticleBackground]
    end

    subgraph 后端["后端 - Express"]
        direction TB
        H[路由 / WebSocket]
        I[Gemini 服务]
        J[多智能体调度]
    end

    subgraph 数据["数据层"]
        K[(PostgreSQL / Neon)]
        L[Drizzle ORM]
        M[schema.ts]
    end

    A --> H
    B --> H
    C --> H --> WebSocket
    D --> H
    E --> H
    H --> I --> J
    H --> L --> M --> K
    J -->|Gemini API| N[Google Gemini 2.0 Flash]
```

## 项目结构

```mermaid
graph LR
    Root[Can0n-ai] --> Client[client/]
    Root --> Server[server/]
    Root --> Shared[shared/]
    Root --> Config[配置文件]

    Client --> CSrc[src/]
    CSrc --> Comp[components/]
    CSrc --> Ctx[context/]
    CSrc --> Pages[pages/]
    Pages --> P1[DashboardPage]
    Pages --> P2[AnalysisPage]
    Pages --> P3[ReportPage]
    Pages --> P4[HistoryPage]
    Pages --> P5[LoginPage]
    Pages --> P6[RegisterPage]
    Comp --> L1[Layout]
    Comp --> L2[ParticleBackground]
    Ctx --> C1[AuthContext]
    Ctx --> C2[ToastContext]

    Server --> SSvc[services/]
    SSvc --> Gemini[gemini.ts]
    Server --> SIdx[index.ts]

    Shared --> Schema[schema.ts]

    Config --> DC[docker-compose.yml]
    Config --> DF[Dockerfile]
    Config --> DZ[drizzle.config.ts]
    Config --> PF[package.json]
    Config --> TS[tsconfig.json]
```

## 快速开始

### 前置要求

- Node.js 18+
- PostgreSQL 14+ (本地或云端)
- Google Gemini API Key

### 1. 克隆项目

```bash
git clone https://github.com/your-username/can0n-ai.git
cd can0n-ai
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/can0n_ai
GEMINI_API_KEY=your_google_gemini_api_key
SESSION_SECRET=your-session-secret-change-in-production
```

获取 Gemini API Key：[Google AI Studio](https://aistudio.google.com/apikey)

### 4. 启动数据库

**方式一：Docker（推荐）**

```bash
docker-compose up -d
```

**方式二：本地 PostgreSQL**

确保 PostgreSQL 运行在 5432 端口，并创建数据库：

```sql
CREATE DATABASE can0n_ai;
```

### 5. 推送数据库 Schema

```bash
npm run db:push
```

### 6. 启动开发服务器

```bash
# 启动后端 (端口 5000)
npm run server

# 新终端，启动前端 (端口 5173)
npm run dev
```

访问 http://localhost:5173

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 前端开发服务器 |
| `npm run server` | 启动 Express 后端服务 (热重载) |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |
| `npm run db:push` | 推送数据库 Schema |

## 使用云端数据库

推荐使用 [Neon](https://neon.tech) 免费的 Serverless PostgreSQL：

1. 注册 Neon 账号并创建项目
2. 复制连接串，替换 `.env` 中的 `DATABASE_URL`
3. 运行 `npm run db:push` 推送 Schema

## 环境变量

| 变量 | 说明 |
|------|------|
| `PORT` | 后端服务端口 |
| `DATABASE_URL` | PostgreSQL 连接串 |
| `GEMINI_API_KEY` | Google Gemini API Key |
| `SESSION_SECRET` | Session 加密密钥 |

## License

MIT
