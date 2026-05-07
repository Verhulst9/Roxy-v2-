# Roxy v2 - Live2D AI Assistant

一个基于 Live2D 的 AI 虚拟助手，采用永久 ReAct 循环架构，支持语音交互、记忆管理、定时任务等功能。

## 功能特性

### 核心功能
- **AI 对话**: 基于 OpenAI API 的智能对话系统
- **语音交互**: 支持 ASR (语音识别) 和 TTS (语音合成)
- **记忆系统**: 基于 Neo4j 的长期记忆存储
- **事件邮箱**: 自主事件队列管理系统
- **日志记录**: SQLite 持久化对话历史

### Live2D 前端
- **实时控制**: 通过 WebSocket 控制 Live2D 模型动作、表情
- **音频广播**: 实时语音输出同步
- **Web 界面**: React + TypeScript 构建的交互界面

### 其他功能
- **定时任务**: 可设置定时提醒
- **网页搜索**: 集成 Tavily API 进行网络搜索
- **上下文压缩**: 智能管理对话上下文长度
- **自动退出**: 关闭浏览器时自动退出后端

## 安装

```bash
# 激活虚拟环境
source .venv/bin/activate

# 安装依赖
pip install -e ".[dev]"

# 启动 Neo4j (可选，用于记忆功能)
docker compose up -d
```

## 配置

创建 `.env` 文件：

```bash
# 必需
OPENAI_API_KEY=your_api_key

# 可选
NAKARI_API_ENABLED=true          # 启用 Live2D API
NAKARI_API_HOST=127.0.0.1
NAKARI_API_PORT=8002
NAKARI_PUBLIC_WS_URL=           # 可选：反向代理/公网部署时 health 返回的 WebSocket 地址
AUTO_SHUTDOWN_ON_DISCONNECT=false  # 关闭浏览器时自动退出后端
AUTO_SHUTDOWN_DELAY_SECONDS=30     # 自动关闭延迟时间（秒）
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```

## 运行

```bash
# 启动后端
nakari

# 启动前端 (另开终端)
cd frontend
npm install
npm run dev
```
