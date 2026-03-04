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

## 更新日志

### 待实现
- 优化流式布局
- 桌宠模式

### v2.1.0 (2026-03-04)
- **功能新增**：
  - 实现音量调节功能（TTS 播放音量实时可调）
  - 实现麦克风灵敏度调节功能

### v2.0.9 (2026-03-03)
- **Bug修复**：
  - 修复新建对话后消息未清空问题（添加空会话处理分支）
  - 修复 live2dSettings 空值检查问题（null/undefined 双重检查）
  - 修复 LeftSidebar 硬编码中文问题（添加国际化支持）
  - 修复 connect 函数依赖问题（使用 urlRef 避免闭包陷阱）
  - 修复 audio_blob 消息格式问题（统一使用 payload 字段）

### v2.0.8 (2026-02-27)
- 启用联网搜索功能
- 启用定时任务功能
- **性能优化**：
  - 优化 journal N+1查询问题（使用单次SQL查询替代循环）
  - 优化 web_tools HTTP连接池（复用ClientSession减少TCP开销）
  - 添加 LLM API超时配置（防止请求无限挂起）
  - 优化 timer loop 错误恢复（长睡眠后重置错误计数器）
  - 优化 API路由封装（添加get_session_metadata公共方法）


### v2.0.7 (2026-02-27)
- **Bug修复**：
  - 修复 `wait_for_events` 竞态条件（优化循环结构防止信号丢失）
  - 修复 WebSocket 回调异常丢失（添加任务跟踪和异常处理）
  - 修复 `passive_compress` 潜在 KeyError（tc["id"] → tc.get("id")）
  - 修复 LLM 空响应 IndexError（添加 choices 空数组检查）
  - 修复环境变量 KeyError（OPENAI_API_KEY 添加清晰错误提示）
  - 修复 WebSocket 客户端 ID 重复（改用 UUID 生成）
  - 修复 metadata 更新未持久化（fields 添加 metadata 字段）
  - 修复 TTS subprocess 清理不完整（kill 后添加 wait 超时保护）
  - 修复 timer 输入验证（添加 datetime 格式异常处理）


### v2.0.6 (2026-02-26)
- **Bug修复**：
  - 修复 timer loop 异常处理（添加指数退避策略）
  - 修复 `asyncio.get_event_loop()` 不安全调用（改用 `time.time()`）
  - 修复 `switch_session` 可能导致未关闭会话的问题
  - 修复前端 HTTPS/WSS 协议转换 bug
  - 修复 JSON Schema required 参数问题（mailbox/asr/web/timer 工具）
  - 修复 EdgeTTSBackend voice 默认值判断逻辑
  - 修复 cli.py frames 类型注解缺失问题


### v2.0.5 (2026-02-25)
- 新增历史聊天记录功能（列出/切换/创建/删除/重命名会话）
- 新增对话内容自动作为会话标题
- 新增批量删除功能
- 侧边栏状态持久化

### v2.0.4 (2026-02-24)
- 新增live2d模型一键切换
- 新增Live2D 位置控制：
- **Bug修复**：
  - 移除所有调试 console.log 语句和全局调试暴露
  - 修复空消息验证逻辑（正确处理字符串 "undefined"/"null"）
  - 添加 localStorage 类型验证（防止恶意/损坏数据导致崩溃）
  - 添加 AudioContext 自动播放策略处理（首次用户交互时初始化）
  - 修复音频重叠播放问题（AudioProcessor）
  - 修复录音状态竞态条件（VoiceInputButton）
  - 修复动画帧清理问题（AudioRecorder）
  - 优化 useCallback 依赖项和 localStorage 写入频率
  - 修复 Live2D canvas 尺寸限制导致的黑色边界问题
  - 修复 positionX/positionY 代码不一致问题（parseInt → parseFloat）
  - 修复 Live2D settings 为 undefined 时的位置计算问题

### v2.0.3 (2026-02-23)
- 加入主题切换功能
- 新增聊天页面显示切换
- **Bug修复**：
  - 修复useWebSocket useEffect依赖数组缺失问题
  - 修复App.tsx中useCallback闭包陷阱（使用ref跟踪最新状态）
  - 修复SettingsContext频繁写入localStorage（添加500ms防抖）
  - 修复AudioProcessor资源清理不完整问题
  - 修复语音输入在WebSocket未连接时无用户提示的问题
  - 修复浅色主题背景色不应用的问题
  - 修复浅色模式下麦克风按钮不可见的问题
  - 修复WebSocket连接状态检查不完整（添加CLOSING状态检查）
  - 修复WebSocket发送消息null检查不安全的问题
  - 修复AudioProcessor requestAnimationFrame内存泄漏
  - 修复AudioRecorder媒体流清理不完整问题
  - 修复AudioRecorder动画帧管理问题
  - 修复VoiceInputButton定时器管理复杂问题
  - 修复RightSidebar自动滚动干扰用户操作问题
  - 修复StatusIndicator默认情况返回空字符串问题


### v2.0.2 (2026-02-22)
- 实现侧边栏
- 优化按钮和边框样式
- 优化布局，主视图智能避让
- 采用流式布局
- 新增设置面板，支持通用/Live2D/音频/高级设置
- 新增语音输入
- 优化自动关闭逻辑：默认关闭，延迟 30 秒，重连取消关闭
- 新增语言切换功能

### v2.0.1 (2025-02-21)
- 新增自动退出功能：关闭浏览器时后端自动退出
- 新增 `AUTO_SHUTDOWN_ON_DISCONNECT` 配置选项
- 改进启动流程和错误处理
- 优化Web页面设计，对对话框和live2d模型进行分离
- 新增 Live2D 前端集成
- 新增 WebSocket API
- 修复前后端连接问题

