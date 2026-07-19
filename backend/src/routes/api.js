import { Router } from 'express';
import { getStatus, getConfig, updateConfig, getAvailableModels } from '../controllers/configController.js';
import { getTools, searchTools, testTool, runRagTests, stopRagTests } from '../controllers/toolsController.js';
import { getMetrics, clearMetrics } from '../controllers/metricsController.js';
import { getSystemPrompt, saveSystemPrompt, activateSystemPrompt, deleteSystemPrompt } from '../controllers/systemPromptController.js';
import { handleChat, stopChat, getChats, getChatMessages, deleteChatSession } from '../controllers/chatController.js';
import { updateMcpProgress, getMcpStatus } from '../controllers/mcpStatusController.js';
import { getGoogleAuthUrl, handleGoogleCallback, getGoogleAuthStatus, disconnectGoogle } from '../controllers/authController.js';
import { streamLogs } from '../controllers/logsController.js';
import { searchPersonalDb, testOkfRetrieval } from '../controllers/personalDbController.js';
import { getSkills, createSkill, updateSkill, deleteSkill, testSkill, generateSkill } from '../controllers/skillsController.js';

const router = Router();

// Base status ping
router.get("/", getStatus);

// Configuration & Tools
router.get("/api/config", getConfig);
router.post("/api/config", updateConfig);
router.get("/api/models", getAvailableModels);
router.get("/api/tools", getTools);
router.get("/api/tools/search", searchTools);
router.post("/api/tools/test", testTool);
router.post("/api/tools/run-tests", runRagTests);
router.post("/api/tools/stop-tests", stopRagTests);
router.get("/api/personal-db/search", searchPersonalDb);
router.get("/api/okf/test-retrieval", testOkfRetrieval);

// Custom Dynamic Skills
router.get("/api/skills", getSkills);
router.post("/api/skills", createSkill);
router.put("/api/skills/:id", updateSkill);
router.delete("/api/skills/:id", deleteSkill);
router.post("/api/skills/test", testSkill);
router.post("/api/skills/generate", generateSkill);


// Google OAuth Flow
router.get("/api/auth/google/url", getGoogleAuthUrl);
router.get("/api/auth/google/callback", handleGoogleCallback);
router.get("/api/auth/google/status", getGoogleAuthStatus);
router.post("/api/auth/google/disconnect", disconnectGoogle);

// MCP background tasks status
router.post("/api/mcp/progress", updateMcpProgress);
router.get("/api/mcp/status", getMcpStatus);

// Metrics
router.get("/api/metrics", getMetrics);
router.delete("/api/metrics", clearMetrics);
router.get("/api/logs/stream", streamLogs);

// System Prompts
router.get("/api/system-prompt", getSystemPrompt);
router.post("/api/system-prompt", saveSystemPrompt);
router.post("/api/system-prompt/activate", activateSystemPrompt);
router.delete("/api/system-prompt/:id", deleteSystemPrompt);

// Chat stream and sessions
router.post("/api/chat", handleChat);
router.post("/api/chat/stop", stopChat);
router.get("/api/chats", getChats);
router.get("/api/chats/:sessionId", getChatMessages);
router.delete("/api/chats/:sessionId", deleteChatSession);

export default router;
