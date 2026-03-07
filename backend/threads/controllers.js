import { Thread } from "../models/thread.models.js";
import { buildGraph } from "../agent/graph.js";
import { checkpointer } from "../configs/sequelize.configs.js";

/**
 * @route   GET /api/threads
 * @desc    Get all threads for the authenticated user
 */
export const getUserThreads = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const threads = await Thread.findAll({
      where: { userId },
      attributes: ['threadId', 'title', 'updatedAt', 'isPinned'],
      order: [['updatedAt', 'DESC']]
    });

    res.status(200).json({ threads });
  } catch (error) {
    console.error("Fetch Threads Error:", error);
    res.status(500).json({ message: "Failed to fetch threads." });
  }
};

/**
 * @route   DELETE /api/threads/:threadId
 * @desc    Delete a thread and its resources
 */
export const deleteThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user?.id || req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const thread = await Thread.findOne({ where: { threadId, userId } });
    
    if (!thread) {
      return res.status(404).json({ message: "Thread not found." });
    }

    // Optional: Delete resource from Cloudinary if needed
    // if (thread.publicId) {
    //   await cloudinary.uploader.destroy(thread.publicId);
    // }

    await thread.destroy();
    res.status(200).json({ message: "Thread deleted successfully." });
  } catch (error) {
    console.error("Delete Thread Error:", error);
    res.status(500).json({ message: "Failed to delete thread." });
  }
};

/**
 * @route   GET /api/threads/:threadId
 * @desc    Get details of a specific thread
 */
export const getThreadById = async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user?.id || req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const thread = await Thread.findOne({ where: { threadId, userId } });
    
    if (!thread) {
      return res.status(404).json({ message: "Thread not found." });
    }

    // Fetch snapshot from LangGraph persistence
    let agentState = null;
    try {
      const graphWithPersistence = buildGraph({ checkpointer });
      const state = await graphWithPersistence.getState({ configurable: { thread_id: threadId } });
      
      if (state && state.values) {
        agentState = {
          detectSummary: state.values.detect_summary || null,
          fixSummary: state.values.fix_summary || null
        };
      }
    } catch (graphError) {
      console.error("Failed to load LangGraph state for thread:", graphError);
    }

    res.status(200).json({ thread, agentState });
  } catch (error) {
    console.error("Fetch Thread Details Error:", error);
    res.status(500).json({ message: "Failed to fetch thread details." });
  }
};
