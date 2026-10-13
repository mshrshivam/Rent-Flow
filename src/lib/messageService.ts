//---------------------------------------------
// Interfaces
//---------------------------------------------

export interface Conversation {
  id: string;
  title: string;
  participants: string[];
  created_at: string;
  updated_at: string;
  lastMessage?: string;
  online?: boolean;
  language?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  translated_content?: string;
  original_language: string;
  attachments?: FileAttachment[];
  created_at: string;
}

export interface FileAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface ExtractedAttachmentText {
  name: string;
  type: 'pdf' | 'txt' | string;
  text: string;
  truncated?: boolean;
}

type RawConversation = {
  id: string;
  participants: string[];
  subject?: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
};

//---------------------------------------------
// GET CONVERSATIONS
//---------------------------------------------

export async function getConversations(userId: string, userEmail?: string): Promise<Conversation[]> {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  if (userEmail) params.set('userEmail', userEmail);

  const response = await fetch(`/api/conversations?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }

  const data: RawConversation[] = await response.json();
  return data.map((conversation) => ({
    id: conversation.id,
    title: conversation.subject || 'Conversation',
    participants: conversation.participants || [],
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    lastMessage: conversation.last_message || '',
    online: false,
    language: 'en',
  }));
}

//---------------------------------------------
// CREATE CONVERSATION
//---------------------------------------------

export async function createConversation(participants: string[], subject: string): Promise<Conversation> {
  const response = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participants, subject }),
  });

  if (!response.ok) {
    throw new Error('Failed to create conversation');
  }

  const conversation = await response.json();
  return {
    id: conversation.id,
    title: conversation.subject || subject,
    participants: conversation.participants || participants,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    lastMessage: '',
    online: false,
    language: 'en',
  };
}

//---------------------------------------------
// UPLOAD FILES WITH CACHING AND RETRY
//---------------------------------------------

export async function uploadFiles(
  files: File[],
  onProgress?: (progress: number) => void
): Promise<FileAttachment[]> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  // Retry logic with exponential backoff
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (onProgress) onProgress(10 + (attempt * 5));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (onProgress) onProgress(50);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (onProgress) onProgress(100);
      
      if (!data.files || !Array.isArray(data.files)) {
        throw new Error('Invalid response from server');
      }

      return data.files;
    } catch (error) {
      lastError = error as Error;
      console.error(`Upload attempt ${attempt + 1} failed:`, error);

      // Don't retry on certain errors
      if (error instanceof Error && 
          (error.message.includes('Invalid file type') || 
           error.message.includes('No files uploaded'))) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError || new Error('Failed to upload files after multiple attempts');
}

//---------------------------------------------
// UPLOAD FILES WITH CACHE
//---------------------------------------------

export async function uploadFilesWithCache(
  files: File[],
  cacheIds: string[],
  onProgress?: (progress: number) => void
): Promise<FileAttachment[]> {
  const { fileCache } = await import('./fileCache');
  await fileCache.init();

  try {
    // Mark files as uploading in cache
    for (const id of cacheIds) {
      await fileCache.updateFileStatus(id, 'uploading');
    }

    // Upload files
    const result = await uploadFiles(files, onProgress);

    // Mark files as uploaded in cache
    for (let i = 0; i < cacheIds.length; i++) {
      if (result[i]) {
        await fileCache.updateFileStatus(cacheIds[i], 'uploaded', result[i].url);
      }
    }

    return result;
  } catch (error) {
    // Mark files as error in cache
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    for (const id of cacheIds) {
      await fileCache.updateFileStatus(id, 'error', undefined, errorMessage);
    }
    throw error;
  }
}

//---------------------------------------------
// GET MESSAGES
//---------------------------------------------

export async function getMessages(conversationId: string): Promise<Message[]> {
  const response = await fetch(`/api/messages?conversationId=${encodeURIComponent(conversationId)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }

  const data = await response.json();
  return data.map((message: any) => ({
    id: message.id,
    conversation_id: message.conversation_id,
    sender_id: message.sender_id,
    content: message.content,
    original_language: message.original_language || 'en',
    translated_content: message.translated_content,
    attachments: message.attachments || [],
    created_at: message.created_at,
  }));
}

//---------------------------------------------
// SEND MESSAGE
//---------------------------------------------

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  originalLanguage = 'en',
  attachments: FileAttachment[] = []
): Promise<Message> {
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      original_language: originalLanguage,
      attachments,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  const message = await response.json();
  return {
    id: message.id,
    conversation_id: message.conversation_id,
    sender_id: message.sender_id,
    content: message.content,
    original_language: message.original_language || originalLanguage,
    translated_content: message.translated_content,
    attachments: message.attachments || attachments,
    created_at: message.created_at,
  };
}

//---------------------------------------------
// EXTRACT ATTACHMENT TEXT (PDF/TXT)
//---------------------------------------------

export async function extractAttachmentText(
  attachments: FileAttachment[]
): Promise<ExtractedAttachmentText[]> {
  const response = await fetch('/api/files/extract-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attachments }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to extract attachment text');
  }

  const data = await response.json();
  return Array.isArray(data.files) ? data.files : [];
}