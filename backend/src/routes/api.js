import { Router } from 'express';
import { getStatus, getConfig } from '../controllers/configController.js';
import { getTools } from '../controllers/toolsController.js';
import { getMetrics, clearMetrics } from '../controllers/metricsController.js';
import { getSystemPrompt, saveSystemPrompt, activateSystemPrompt, deleteSystemPrompt } from '../controllers/systemPromptController.js';
import { handleChat, getChats, getChatMessages, deleteChatSession } from '../controllers/chatController.js';
import { updateMcpProgress, getMcpStatus } from '../controllers/mcpStatusController.js';

const router = Router();

// Base status ping
router.get("/", getStatus);

// Configuration & Tools
router.get("/api/config", getConfig);
router.get("/api/tools", getTools);

// MCP background tasks status
router.post("/api/mcp/progress", updateMcpProgress);
router.get("/api/mcp/status", getMcpStatus);

// Metrics
router.get("/api/metrics", getMetrics);
router.delete("/api/metrics", clearMetrics);

// System Prompts
router.get("/api/system-prompt", getSystemPrompt);
router.post("/api/system-prompt", saveSystemPrompt);
router.post("/api/system-prompt/activate", activateSystemPrompt);
router.delete("/api/system-prompt/:id", deleteSystemPrompt);

// Chat stream and sessions
router.post("/api/chat", handleChat);
router.get("/api/chats", getChats);
router.get("/api/chats/:sessionId", getChatMessages);
router.delete("/api/chats/:sessionId", deleteChatSession);

export default router;
