// Dummy actions for Chat and Workspace UI to render without errors
import axios from "../axios.js";
export const loadChatThreadsAction = async () => {
  try {
    const { data } = await axios.get("/main/threads");
    return { threads: data.threads };
  } catch (error) {
    console.error("Failed to load threads:", error);
    return { error: error.response?.data?.message || error.message, threads: [] };
  }
};

export const loadThreadDetailsAction = async (threadId) => {
  try {
    const { data } = await axios.get(`/main/threads/${threadId}`);
    return { thread: data.thread };
  } catch (error) {
    console.error("Failed to load thread details:", error);
    return { error: error.response?.data?.message || error.message };
  }
};

export const loadChatHistoryAction = async (threadId, signal) => {
  return {
    messages: [
      {
        role: "assistant",
        content: "Hello! This is a dummy thread for " + threadId
      }
    ]
  };
};

export const deleteThreadAction = async (threadId) => {
  try {
    const { data } = await axios.delete(`/main/threads/${threadId}`);
    return { success: true, data };
  } catch (error) {
    console.error("Failed to delete thread:", error);
    return { error: error.response?.data?.message || error.message, success: false };
  }
};

export const streamChatAction = async ({ threadId, message, webSearch }) => {
  // Return a dummy stream
  const createStream = async function* () {
    yield { type: 'token', val: 'This ' };
    yield { type: 'token', val: 'is ' };
    yield { type: 'token', val: 'a ' };
    yield { type: 'token', val: 'dummy ' };
    yield { type: 'token', val: 'response.' };
  };

  return {
    stream: createStream(),
    abort: () => { console.log('Aborted dummy stream'); }
  };
};

export const ingestDocumentsAction = async (threadId, attachments) => {
  return { success: true };
};
