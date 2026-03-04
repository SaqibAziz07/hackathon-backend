import mongoose from "mongoose";

const entrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, // required so entries are always scoped to a user
  },
  userInput: {
    type: String,
    required: true,
  },
  aiOutput: {
    type: String,
    default: "",
  },
  category: {
    type: String, // e.g., "blog", "summary", "idea"
    default: "general",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add index if used frequently
entrySchema.index({ userId: 1, createdAt: -1 });

const Entry = mongoose.models.Entry || mongoose.model("Entry", entrySchema);
export default Entry;