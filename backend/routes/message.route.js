import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { listConversations, getOrCreateConversation, listMessages, sendMessage, unreadCount, markConversationRead, reactToMessage, reactToMessageById, aiAssist } from '../controllers/message.controller.js';

const router = express.Router();

router.get('/conversations', protectRoute, listConversations);
router.post('/conversations/with/:userId', protectRoute, getOrCreateConversation);
router.get('/conversations/:conversationId/messages', protectRoute, listMessages);
router.post('/conversations/:conversationId/messages', protectRoute, sendMessage);
router.get('/unread-count', protectRoute, unreadCount);
router.put('/conversations/:conversationId/read', protectRoute, markConversationRead);
router.post('/conversations/:conversationId/messages/:messageId/react', protectRoute, reactToMessage);
router.post('/messages/:messageId/react', protectRoute, reactToMessageById);
router.post('/ai/assist', protectRoute, aiAssist);

export default router;