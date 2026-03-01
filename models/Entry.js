import mongoose from "mongoose";

const entrySchema = new mongoose.Schema({
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

const Entry = mongoose.model("Entry", entrySchema);
export default Entry;