import { Router } from 'express';
import { getStatus, getConfig } from '../controllers/configController.js';
import { getTools } from '../controllers/toolsController.js';
import { getMetrics, clearMetrics } from '../controllers/metricsController.js';
import { getSystemPrompt, saveSystemPrompt, activateSystemPrompt, deleteSystemPrompt } from '../controllers/systemPromptController.js';
import { handleChat } from '../controllers/chatController.js';

const router = Router();

// Base status ping
router.get("/", getStatus);

// Configuration & Tools
router.get("/api/config", getConfig);
router.get("/api/tools", getTools);

// Metrics
router.get("/api/metrics", getMetrics);
router.delete("/api/metrics", clearMetrics);

// System Prompts
router.get("/api/system-prompt", getSystemPrompt);
router.post("/api/system-prompt", saveSystemPrompt);
router.post("/api/system-prompt/activate", activateSystemPrompt);
router.delete("/api/system-prompt/:id", deleteSystemPrompt);

// Chat stream
router.post("/api/chat", handleChat);

export default router;
