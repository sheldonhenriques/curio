import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['user', 'assistant', 'tool_use', 'tool_result', 'system', 'error', 'status', 'progress', 'complete', 'claude_response', 'thinking', 'completion']
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const ChatSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  nodeId: {
    type: String,
    required: true,
    index: true
  },
  projectId: {
    type: String,
    required: true,
    index: true
  },
  messages: [MessageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
});

// Create compound index for efficient queries
ChatSessionSchema.index({ nodeId: 1, isActive: 1 });
ChatSessionSchema.index({ createdAt: 1 }); // For cleanup queries

// Update the updatedAt field on save
ChatSessionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find active session by node ID
ChatSessionSchema.statics.findActiveByNodeId = function(nodeId) {
  return this.findOne({ nodeId, isActive: true }).sort({ updatedAt: -1 });
};

// Static method to cleanup old sessions
ChatSessionSchema.statics.cleanupOldSessions = function(hoursOld = 5) {
  const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
  return this.deleteMany({ createdAt: { $lt: cutoffTime } });
};

// Instance method to add message
ChatSessionSchema.methods.addMessage = function(type, content, metadata = {}, customId = null, customTimestamp = null) {
  const message = {
    id: customId || new mongoose.Types.ObjectId().toString(),
    type,
    content,
    timestamp: customTimestamp || new Date(),
    metadata
  };
  
  this.messages.push(message);
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to deactivate session
ChatSessionSchema.methods.deactivate = function() {
  this.isActive = false;
  this.updatedAt = new Date();
  return this.save();
};

export default mongoose.models.ChatSession || mongoose.model('ChatSession', ChatSessionSchema);