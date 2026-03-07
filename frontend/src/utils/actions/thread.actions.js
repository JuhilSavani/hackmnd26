// Dummy actions for Chat and Workspace UI to render without errors
import axios from "../axios.js";

export const loadAllThreadsAction = async () => {
  try {
    const { data } = await axios.get("/threads");
    return { threads: data.threads };
  } catch (error) {
    console.error("Failed to load threads:", error);
    return { error: error.response?.data?.message || error.message, threads: [] };
  }
};

export const loadThreadDetailsAction = async (threadId) => {
  try {
    const { data } = await axios.get(`/threads/${threadId}`);
    return { thread: data.thread, agentState: data.agentState };
  } catch (error) {
    console.error("Failed to load thread details:", error);
    return { error: error.response?.data?.message || error.message };
  }
};

export const deleteThreadAction = async (threadId) => {
  try {
    const { data } = await axios.delete(`/threads/${threadId}`);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to delete thread:", error);
    return { error: error.response?.data?.message || error.message, success: false };
  }
};

export const generateSecureUrlAction = async (threadId) => {
  try {
    // Note: uses the document routes from index.js
    const { data } = await axios.get(`/document/finalize/${threadId}`);
    return { downloadUrl: data.downloadUrl, error: null };
  } catch (error) {
    console.error("Failed to generate secure URL:", error);
    return { error: error.response?.data?.error || error.message, downloadUrl: null };
  }
};
