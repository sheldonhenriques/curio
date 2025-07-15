import mongoose from 'mongoose';

const ProjectSectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Not Started', 'Concept', 'In Progress', 'Completed']
  }
}, { _id: false });

const ProjectSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    required: true,
    enum: ['blue', 'purple', 'green', 'yellow', 'red', 'indigo', 'orange', 'pink', 'gray']
  },
  starred: {
    type: Boolean,
    default: false
  },
  progress: {
    type: Number,
    default: 0,
    min: 0
  },
  totalTasks: {
    type: Number,
    default: 0,
    min: 0
  },
  updatedAt: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['on-track', 'overdue', 'completed', 'paused']
  },
  tags: [{
    type: String,
    trim: true
  }],
  team: [{
    type: String,
    trim: true
  }],
  sandboxId: {
    type: String,
    trim: true
  },
  sections: [ProjectSectionSchema],
  updatedAtTimestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

ProjectSchema.pre('save', function(next) {
  this.updatedAtTimestamp = new Date();
  next();
});

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);