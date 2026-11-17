
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    intent: {
      type: String,
      default: "conversation",
    },
  },
  { timestamps: true }
);

const chatConversationSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    messages: {
      type: [messageSchema],
      default: [],
    },

    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

chatConversationSchema.index(
  { lastActivityAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 7 }
);

chatConversationSchema.index({ user: 1, lastActivityAt: -1 });

module.exports =
  mongoose.models.ChatConversation ||
  mongoose.model("ChatConversation", chatConversationSchema);
