import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  // attachment (optional)
  attachment: {
    url: { type: String, default: '' },
    type: { type: String, default: '' }, // mime type
    name: { type: String, default: '' },
    size: { type: Number, default: 0 },
  },
  // Optional reply target
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  // Reactions (per user, a single type)
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // emoji or token
  }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);
export default Message;