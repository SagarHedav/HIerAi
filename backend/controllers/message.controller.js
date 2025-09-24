import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import cloudinary from '../lib/cloudinary.js';

export const listConversations = async (req, res) => {
  try {
    const convos = await Conversation.find({ participants: req.user._id })
      .sort({ updatedAt: -1 })
      .populate({ path: 'participants', select: 'name username profilePicture' });
    res.json(convos);
  } catch (e) {
    console.error('listConversations error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOrCreateConversation = async (req, res) => {
  try {
    const otherId = req.params.userId;
    let convo = await Conversation.findOne({ participants: { $all: [req.user._id, otherId], $size: 2 } });
    if (!convo) {
      convo = await Conversation.create({ participants: [req.user._id, otherId] });
    }
    convo = await convo.populate({ path: 'participants', select: 'name username profilePicture' });
    res.json(convo);
  } catch (e) {
    console.error('getOrCreateConversation error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const listMessages = async (req, res) => {
  try {
    const convoId = req.params.conversationId;
    const msgs = await Message.find({ conversation: convoId })
      .sort({ createdAt: 1 })
      .populate({ path: 'sender', select: 'name username profilePicture' })
      .populate({ path: 'replyTo', select: 'content sender createdAt', populate: { path: 'sender', select: 'name username profilePicture' } });
    res.json(msgs);
  } catch (e) {
    console.error('listMessages error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const convoId = req.params.conversationId;
    const { content, replyTo, attachment } = req.body;

    if ((!content || typeof content !== 'string' || !content.trim()) && !attachment?.data) {
      return res.status(400).json({ message: 'content or attachment is required' });
    }

    // Validate optional replyTo
    let replyRef = null;
    if (replyTo) {
      try {
        const target = await Message.findById(replyTo).select('conversation');
        if (target && target.conversation.toString() === convoId) {
          replyRef = target._id;
        }
      } catch (err) {
        // ignore invalid ObjectId
        console.warn('sendMessage: invalid replyTo ignored', err?.message);
      }
    }

    // Optional attachment upload via Cloudinary
    let att = null;
    if (attachment?.data) {
      const mime = attachment.type || '';
      try {
        // Try auto first (lets Cloudinary choose image/video/raw)
        let up;
        // estimate byte size from base64 data URL (strip header)
        const b64 = typeof attachment.data === 'string' ? attachment.data.split(',').pop() || '' : '';
        const approxBytes = Math.ceil(b64.length * 3 / 4);
        const isVideo = mime.startsWith('video/');
        // If very large video, attempt chunked upload
        if (isVideo && approxBytes > 95 * 1024 * 1024 && cloudinary.uploader.upload_large) {
          try {
            up = await cloudinary.uploader.upload_large(attachment.data, {
              resource_type: 'video',
              chunk_size: 6 * 1024 * 1024,
              timeout: 180000,
            });
          } catch (eLarge) {
            // fallback to auto/specific
          }
        }
        if (!up) {
          try {
            up = await cloudinary.uploader.upload(attachment.data, { resource_type: 'auto', timeout: 120000 });
          } catch (err1) {
            const resource_type = isVideo ? 'video' : mime.startsWith('image/') ? 'image' : 'raw';
            up = await cloudinary.uploader.upload(attachment.data, { resource_type, timeout: 120000 });
          }
        }
        att = {
          url: up.secure_url,
          type: mime,
          name: attachment.name || '',
          size: typeof attachment.size === 'number' ? attachment.size : 0,
        };
      } catch (err) {
        const msg = err?.error?.message || err?.message || 'Attachment upload failed';
        console.error('Attachment upload failed', msg);
        return res.status(500).json({ message: `Attachment upload failed: ${msg}` });
      }
    }

    const msg = await Message.create({
      conversation: convoId,
      sender: req.user._id,
      content: (content || '').trim(),
      attachment: att || undefined,
      replyTo: replyRef,
      readBy: [req.user._id]
    });

    // Human readable preview for conversations list
    let preview = (content && content.trim()) || '';
    if (!preview && att) {
      const t = att.type || '';
      if (t.startsWith('image/')) preview = '📷 Photo';
      else if (t.startsWith('video/')) preview = '🎥 Video';
      else preview = '📄 File';
    }

    const convo = await Conversation.findByIdAndUpdate(convoId, { lastMessage: preview, updatedAt: new Date() }, { new: true });
    await msg.populate([
      { path: 'sender', select: 'name username profilePicture' },
      { path: 'replyTo', select: 'content sender createdAt', populate: { path: 'sender', select: 'name username profilePicture' } },
    ]);
    const populated = msg;
    // emit to all participants except sender
    const io = req.app.get('io');
    if (io && convo) {
      for (const uid of convo.participants) {
        if (uid.toString() !== req.user._id.toString()) {
          io.to(`user:${uid.toString()}`).emit('message:new', { conversationId: convoId, message: populated });
          io.to(`user:${uid.toString()}`).emit('messages:unreadIncrement', 1);
        }
      }
    }
    res.status(201).json(populated);
  } catch (e) {
    console.error('sendMessage error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const unreadCount = async (req, res) => {
  try {
    // find conversations of current user
    const convos = await Conversation.find({ participants: req.user._id }).select('_id');
    const convoIds = convos.map(c => c._id);
    if (convoIds.length === 0) return res.json({ count: 0 });
    const count = await Message.countDocuments({
      conversation: { $in: convoIds },
      sender: { $ne: req.user._id },
      readBy: { $ne: req.user._id },
    });
    res.json({ count });
  } catch (e) {
    console.error('unreadCount error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const markConversationRead = async (req, res) => {
  try {
    const convoId = req.params.conversationId;
    await Message.updateMany({ conversation: convoId, readBy: { $ne: req.user._id } }, { $push: { readBy: req.user._id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('markConversationRead error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle a reaction for the current user on a message
export const reactToMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { type } = req.body;
    if (!type) return res.status(400).json({ message: 'type is required' });

    const msg = await Message.findOne({ _id: messageId, conversation: conversationId });
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    const idx = msg.reactions.findIndex(r => r.user.toString() === req.user._id.toString());
    if (idx >= 0) {
      if (msg.reactions[idx].type === type) {
        // remove if same reaction (toggle off)
        msg.reactions.splice(idx, 1);
      } else {
        msg.reactions[idx].type = type;
      }
    } else {
      msg.reactions.push({ user: req.user._id, type });
    }
    await msg.save();

    await msg.populate([
      { path: 'sender', select: 'name username profilePicture' },
      { path: 'replyTo', select: 'content sender createdAt', populate: { path: 'sender', select: 'name username profilePicture' } },
    ]);

    res.json(msg);
  } catch (e) {
    console.error('reactToMessage error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// Same as above but only needs messageId; validates access via conversation membership
export const reactToMessageById = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { type } = req.body;
    if (!type) return res.status(400).json({ message: 'type is required' });

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    // Ensure the authed user is a participant of the conversation
    const convo = await Conversation.findById(msg.conversation).select('participants');
    if (!convo || !convo.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const idx = msg.reactions.findIndex(r => r.user.toString() === req.user._id.toString());
    if (idx >= 0) {
      if (msg.reactions[idx].type === type) {
        msg.reactions.splice(idx, 1);
      } else {
        msg.reactions[idx].type = type;
      }
    } else {
      msg.reactions.push({ user: req.user._id, type });
    }
    await msg.save();

    await msg.populate([
      { path: 'sender', select: 'name username profilePicture' },
      { path: 'replyTo', select: 'content sender createdAt', populate: { path: 'sender', select: 'name username profilePicture' } },
    ]);

    res.json(msg);
  } catch (e) {
    console.error('reactToMessageById error', e);
    res.status(500).json({ message: 'Server error' });
  }
};

export const aiAssist = async (req, res) => {
  try {
    const { mode, toUserId, text } = req.body;
    if (mode === 'intro') {
      // reuse user.controller logic via dynamic import
      const { default: User } = await import('../models/user.model.js')
      const me = await User.findById(req.user._id).select('name headline skills')
      const them = await User.findById(toUserId).select('name headline experience education')
      const myName = me?.name || 'I'
      const myHeadline = me?.headline || ''
      const theirName = them?.name || 'there'
      const theirHeadline = them?.headline || ''
      const lastCompany = (them?.experience||[])[0]?.company || ''
      const lastSchool = (them?.education||[])[0]?.school || ''
      const prompt = `Write a friendly, concise 2–3 sentence intro for a DM.\nMe: ${myName}, ${myHeadline}. Recipient: ${theirName}, ${theirHeadline}. ${lastCompany?`Last company ${lastCompany}.`:''} ${lastSchool?`School ${lastSchool}.`:''}`
      let out = `Hi ${theirName.split(' ')[0]}, I’m ${myName}${myHeadline?`, ${myHeadline}`:''}. Would love to connect and swap insights.${lastCompany?` I enjoyed your work at ${lastCompany}.`:''}`
      try {
        const key = process.env.GEMINI_API_KEY
        if (key) {
          const { GoogleGenerativeAI } = await import('@google/generative-ai')
          const genAI = new GoogleGenerativeAI(key)
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
          const resp = await model.generateContent([{ text: prompt }])
          out = resp.response.text().trim()
        }
      } catch {}
      return res.json({ text: out })
    }

    if (mode === 'fix') {
      let out = (text||'').trim()
      if (!out) return res.json({ text: '' })
      // simple fallback fix: sentence-case and ensure punctuation
      out = out.replace(/\s+/g,' ').replace(/(^\w|[\.\?!]\s+\w)/g, s => s.toUpperCase())
      if (!/[\.\?!]$/.test(out)) out += '.'
      try {
        const key = process.env.GEMINI_API_KEY
        if (key) {
          const { GoogleGenerativeAI } = await import('@google/generative-ai')
          const genAI = new GoogleGenerativeAI(key)
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
          const prompt = `Rewrite the following DM to be clear, concise, and grammatically correct. Keep tone friendly and under 2–3 sentences.\n---\n${text}`
          const resp = await model.generateContent([{ text: prompt }])
          out = resp.response.text().trim()
        }
      } catch {}
      return res.json({ text: out })
    }

    return res.status(400).json({ message: 'invalid mode' })
  } catch (e) {
    console.error('aiAssist error', e)
    res.status(500).json({ message: 'Server error' })
  }
}
