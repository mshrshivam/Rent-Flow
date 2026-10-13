import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Search, Phone, Video, MoreVertical, Paperclip, Smile, User, Globe, Sparkles, Zap, FileText, X, File, Download, AlertCircle, Heart } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import GlassCard from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { translateText, detectLanguage, batchTranslate } from '@/lib/translate';
import { getConversations, getMessages, sendMessage, createConversation, uploadFiles, uploadFilesWithCache, extractAttachmentText, type Conversation, type Message, type FileAttachment } from '@/lib/messageService';
import { useAuth } from '@/contexts/AuthContext';
import { getTenants, getTenancies } from '@/lib/propertyService';
import { getChatCompletion, summarizeLeaseDQWithGroq, type GroqMessage } from '@/lib/groqService';
import { toast } from 'sonner';
import { fileCache } from '@/lib/fileCache';

const Messages = () => {
  const { language } = useLanguage();
  const { user } = useAuth();

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Please log in to view messages.</p>
        </div>
      </DashboardLayout>
    );
  }

  const currentUserId = user.id;
  const currentUserRole = user.role;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [translatedMessages, setTranslatedMessages] = useState<any[]>([]);
  const [translatedConversationLastMessages, setTranslatedConversationLastMessages] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [translatedMessage, setTranslatedMessage] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAIMode, setIsAIMode] = useState(false);
  const [aiMessages, setAiMessages] = useState<GroqMessage[]>([]);
  const [isAILoading, setIsAILoading] = useState(false);
  const [showLeaseSummarizer, setShowLeaseSummarizer] = useState(false);
  const [leaseText, setLeaseText] = useState('');
  const [leaseSummary, setLeaseSummary] = useState<any>(null);
  const [isProcessingLease, setIsProcessingLease] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileCacheIds, setFileCacheIds] = useState<string[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<FileAttachment[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [owners, setOwners] = useState<any[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [favoriteHomes, setFavoriteHomes] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(false);
  const deepLinkHandledRef = useRef(false);

  // Fetch available users based on role
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const users: any[] = [];
        
        if (currentUserRole === 'owner') {
          // Owner can chat with manager and tenants
          users.push({
            id: 'manager@test.com',
            full_name: 'Property Manager',
            email: 'manager@test.com',
            role: 'manager'
          });

          try {
            const tenantRes = await fetch(`/api/tenants?ownerId=${encodeURIComponent(currentUserId)}`);
            if (tenantRes.ok) {
              const tenantRows = await tenantRes.json();
              users.push(
                ...tenantRows.map((t: any) => ({
                  id: t.tenant_id || t.id,
                  full_name: t.full_name,
                  email: t.email,
                  role: 'tenant',
                }))
              );
            }
          } catch (error) {
            console.error('Error loading owner tenant contacts:', error);
          }
        } else if (currentUserRole === 'manager') {
          // Manager can chat with owner and tenants
          try {
            const ownersRes = await fetch('/api/owners');
            if (ownersRes.ok) {
              const ownerRows = await ownersRes.json();
              users.push(
                ...ownerRows.map((o: any) => ({
                  id: o.id,
                  full_name: o.full_name,
                  email: o.email,
                  role: 'owner',
                }))
              );
            }
          } catch (error) {
            console.error('Error loading owners:', error);
          }

          try {
            const tenantRes = await fetch('/api/tenants?scope=all');
            if (tenantRes.ok) {
              const tenantRows = await tenantRes.json();
              users.push(
                ...tenantRows.map((t: any) => ({
                  id: t.tenant_id || t.id,
                  full_name: t.full_name,
                  email: t.email,
                  role: 'tenant',
                }))
              );
            }
          } catch (error) {
            console.error('Error loading manager tenant contacts:', error);
          }
        } else if (currentUserRole === 'tenant') {
          // Tenant can chat with owner, manager, and other tenants
          users.push({
            id: 'owner@test.com',
            full_name: 'Property Owner',
            email: 'owner@test.com',
            role: 'owner'
          });
          
          users.push({
            id: 'manager@test.com',
            full_name: 'Property Manager',
            email: 'manager@test.com',
            role: 'manager'
          });
          
          // Add other tenants
          const storedTenants = localStorage.getItem('tenants');
          if (storedTenants) {
            const tenants = JSON.parse(storedTenants);
            const otherTenants = tenants.filter((t: any) => 
              t.id !== currentUserId && t.email !== currentUserId
            );
            users.push(...otherTenants);
          }
        }
        
        const dedupedUsers = Array.from(
          new Map(users.map((u) => [u.email || u.id, u])).values()
        );
        console.log('Available users for', currentUserRole, ':', dedupedUsers);
        setAvailableUsers(dedupedUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [user, currentUserRole, currentUserId]);

  // Fetch owners for manager dropdown
  useEffect(() => {
    if (currentUserRole === 'manager') {
      const fetchOwners = async () => {
        try {
          const response = await fetch('/api/owners');
          if (!response.ok) {
            setOwners([]);
            return;
          }

          const data = await response.json();
          const ownerRows = Array.isArray(data) ? data : [];
          setOwners(ownerRows);
          if (ownerRows.length > 0 && !selectedOwnerId) {
            setSelectedOwnerId(ownerRows[0].id);
          }
        } catch (error) {
          console.error('Error fetching owners:', error);
          setOwners([]);
        }
      };
      fetchOwners();
    }
  }, [currentUserRole]);

  const managerOwnerOptions = owners.length > 0
    ? owners
    : availableUsers.filter((u) => u.role === 'owner');

  useEffect(() => {
    if (currentUserRole !== 'manager' || selectedOwnerId || managerOwnerOptions.length === 0) return;
    setSelectedOwnerId(managerOwnerOptions[0].id);
  }, [currentUserRole, selectedOwnerId, managerOwnerOptions]);

  useEffect(() => {
    const loadFavoriteHomes = async () => {
      if (currentUserRole !== 'tenant' || !user?.id) {
        setFavoriteHomes([]);
        return;
      }

      try {
        const response = await fetch(`/api/favorites?tenantId=${encodeURIComponent(user.id)}`);
        if (!response.ok) {
          setFavoriteHomes([]);
          return;
        }
        const rows = await response.json();
        setFavoriteHomes(Array.isArray(rows) ? rows : []);
      } catch (error) {
        console.error('Error loading favorite homes:', error);
        setFavoriteHomes([]);
      }
    };

    loadFavoriteHomes();
  }, [currentUserRole, user?.id]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        console.log('Fetching conversations for user:', currentUserId, 'role:', currentUserRole);
        const convs = await getConversations(currentUserId, user.email);
        console.log('Fetched conversations:', convs);
        setConversations(convs);
        
        // If no conversations exist, initialize with mock data
        if (convs.length === 0) {
          // Force initialize conversations from mock data
          localStorage.setItem('conversations', JSON.stringify([]));
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setConversations([]);
      }
    };
    
    fetchConversations();
  }, [currentUserId, currentUserRole]);

  useEffect(() => {
    if (selectedConversation) {
      shouldAutoScrollRef.current = true;

      const fetchMessages = async () => {
        try {
          const msgs = await getMessages(selectedConversation.id);
          setMessages(msgs);
        } catch (error) {
          console.error('Error fetching messages:', error);
          setMessages([]);
        }
      };
      fetchMessages();
      
      const interval = setInterval(fetchMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!selectedConversation || !shouldAutoScrollRef.current || messages.length === 0) {
      return;
    }

    scrollToBottom();
    shouldAutoScrollRef.current = false;
  }, [messages, selectedConversation?.id]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    if (value.trim()) {
      const detected = detectLanguage(value);
      setDetectedLanguage(detected);
    }
    
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      if (value.trim()) {
        setIsTranslating(true);
        const targetLang = language;
        
        if (detectedLanguage && detectedLanguage !== targetLang) {
          const translated = await translateText(value, detectedLanguage, targetLang);
          setTranslatedMessage(translated);
        } else {
          setTranslatedMessage('');
        }
        setIsTranslating(false);
      } else {
        setTranslatedMessage('');
        setDetectedLanguage('');
      }
    }, 500);
  };

  useEffect(() => {
    const translateAll = async () => {
      if (!messages.length) return;

      const requests = messages.map((msg) => ({
        text: msg.content,
        sourceLang: msg.original_language || 'en',
      }));

      let translatedTexts: string[] = [];
      try {
        translatedTexts = await batchTranslate(requests, language);
      } catch (error) {
        translatedTexts = messages.map((msg) => msg.content);
      }

      const translated = messages.map((msg, idx) => {
        const translatedContent = translatedTexts[idx] || msg.content;
        const isTranslated = translatedContent !== msg.content;
        return {
          ...msg,
          content: translatedContent,
          originalContent: msg.content,
          isTranslated,
        };
      });
      setTranslatedMessages(translated);
    };
    translateAll();
  }, [messages, language, currentUserId]);

  useEffect(() => {
    const translateConversationPreviews = async () => {
      if (!conversations.length) {
        setTranslatedConversationLastMessages({});
        return;
      }

      const requests = conversations.map((conversation) => ({
        text: conversation.lastMessage || '',
        sourceLang: detectLanguage(conversation.lastMessage || ''),
      }));

      let translatedTexts: string[] = [];
      try {
        translatedTexts = await batchTranslate(requests, language);
      } catch (error) {
        translatedTexts = conversations.map((conversation) => conversation.lastMessage || '');
      }

      const translatedMap = conversations.reduce<Record<string, string>>((accumulator, conversation, index) => {
        accumulator[conversation.id] = translatedTexts[index] || conversation.lastMessage || '';
        return accumulator;
      }, {});

      setTranslatedConversationLastMessages(translatedMap);
    };

    translateConversationPreviews();
  }, [conversations, language]);

  useEffect(() => {
    if (deepLinkHandledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const chatUser = params.get('chatUser');
    const chatName = params.get('chatName');

    if (!chatUser || availableUsers.length === 0) return;

    const normalizedChatUser = chatUser.toLowerCase();
    const target =
      availableUsers.find((u) => String(u.email || '').toLowerCase() === normalizedChatUser) ||
      availableUsers.find((u) => String(u.id || '').toLowerCase() === normalizedChatUser) ||
      {
        id: chatUser,
        email: chatUser,
        full_name: chatName || chatUser,
        role: 'tenant',
      };

    deepLinkHandledRef.current = true;
    handleStartConversationWithUser(target);

    params.delete('chatUser');
    params.delete('chatName');
    const newQuery = params.toString();
    const newUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', newUrl);
  }, [availableUsers, conversations]);

  const handleSelectOwner = async (ownerId: string) => {
    if (!ownerId) return;

    setSelectedOwnerId(ownerId);
    const selectedOwner = managerOwnerOptions.find(o => o.id === ownerId || o.email === ownerId);
    const ownerIdentifier = selectedOwner?.email || selectedOwner?.id || ownerId;
    
    // Check if conversation already exists
    const existingConversation = conversations.find((c) =>
      c.participants.includes(currentUserId) &&
      (c.participants.includes(ownerId) || c.participants.includes(ownerIdentifier))
    );
    
    if (existingConversation) {
      shouldAutoScrollRef.current = true;
      setSelectedConversation(existingConversation);
    } else {
      // Create a new conversation with the selected owner
      try {
        const newConversation = await createConversation(
          [currentUserId, ownerIdentifier],
          selectedOwner?.full_name || 'Owner'
        );
        setConversations([newConversation, ...conversations]);
        shouldAutoScrollRef.current = true;
        setSelectedConversation(newConversation);
      } catch (error) {
        console.error('Error creating conversation:', error);
        toast.error('Failed to create conversation');
      }
    }
  };

  const handleStartConversationWithUser = async (targetUser: any) => {
    if (!targetUser) return;

    const targetIdentifier = targetUser.email || targetUser.id;
    const existingConversation = conversations.find((c) =>
      c.participants.includes(currentUserId) && c.participants.includes(targetIdentifier)
    );

    if (existingConversation) {
      shouldAutoScrollRef.current = true;
      setSelectedConversation(existingConversation);
      return;
    }

    try {
      const newConversation = await createConversation(
        [currentUserId, targetIdentifier],
        targetUser.full_name || targetUser.name || targetUser.email || 'Conversation'
      );
      setConversations((prev) => [newConversation, ...prev]);
      shouldAutoScrollRef.current = true;
      setSelectedConversation(newConversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const handleSendMessage = async () => {
    if ((!message.trim() && selectedFiles.length === 0) || !selectedConversation) return;

    try {
      const sourceLanguage = message.trim() ? detectLanguage(message.trim()) : 'en';

      // Upload files first if any selected
      let attachments: FileAttachment[] = uploadedAttachments;
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        setUploadProgress(0);
        
        const uploadToast = toast.loading('Uploading files...', {
          description: '0% complete'
        });

        try {
          // Upload with caching and progress tracking
          attachments = await uploadFilesWithCache(
            selectedFiles, 
            fileCacheIds,
            (progress) => {
              setUploadProgress(progress);
              toast.loading('Uploading files...', {
                id: uploadToast,
                description: `${progress}% complete`
              });
            }
          );
          
          toast.success('Files uploaded successfully!', { id: uploadToast });
          setUploadedAttachments([]);
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(uploadError instanceof Error ? uploadError.message : 'Failed to upload files', { 
            id: uploadToast 
          });
          setIsUploading(false);
          setUploadProgress(0);
          return; // Don't send message if upload fails
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }

      const newMessage = await sendMessage(
        selectedConversation.id, 
        currentUserId, 
        message || 'Sent file(s)', 
        sourceLanguage,
        attachments
      );
      
      if (newMessage) {
        shouldAutoScrollRef.current = true;
        setMessages(prev => [...prev, newMessage]);
        setMessage('');
        setTranslatedMessage('');
        setSelectedFiles([]);
        setFileCacheIds([]);
        scrollToBottom();
        toast.success('Message sent!');
        
        // Refresh conversations to update last message
        const updatedConvs = await getConversations(currentUserId, user.email);
        setConversations(updatedConvs);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      
      // Check total file count
      if (selectedFiles.length + newFiles.length > 5) {
        toast.error('Maximum 5 files allowed');
        return;
      }
      
      // Check individual file size (10MB)
      const oversized = newFiles.find(f => f.size > 10 * 1024 * 1024);
      if (oversized) {
        toast.error(`${oversized.name} exceeds 10MB limit`);
        return;
      }

      // Cache files for upload resilience
      try {
        await fileCache.init();
        const cacheIds = await Promise.all(
          newFiles.map(file => fileCache.cacheFile(file))
        );
        
        setSelectedFiles(prev => [...prev, ...newFiles]);
        setFileCacheIds(prev => [...prev, ...cacheIds]);
        toast.success(`${newFiles.length} file(s) selected and cached`);
      } catch (error) {
        console.error('Error caching files:', error);
        // Still allow selection even if caching fails
        setSelectedFiles(prev => [...prev, ...newFiles]);
        toast.warning(`${newFiles.length} file(s) selected (caching unavailable)`);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = async (index: number) => {
    // Remove from cache if exists
    if (fileCacheIds[index]) {
      try {
        await fileCache.deleteFile(fileCacheIds[index]);
      } catch (error) {
        console.error('Error removing cached file:', error);
      }
    }
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFileCacheIds(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleAISendMessage = async () => {
    if (!message.trim() && selectedFiles.length === 0) return;

    setIsAILoading(true);
    try {
      const baseUserMessage = message.trim();
      let aiPromptContent = baseUserMessage;
      let visibleUserMessage = baseUserMessage;
      let attachments: FileAttachment[] = [];

      // Upload files if any selected
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        setUploadProgress(0);
        
        const uploadToast = toast.loading('Uploading files for AI...', {
          description: '0% complete'
        });

        try {
          // Upload with caching and progress tracking
          attachments = await uploadFilesWithCache(
            selectedFiles, 
            fileCacheIds,
            (progress) => {
              setUploadProgress(progress);
              toast.loading('Uploading files...', {
                id: uploadToast,
                description: `${progress}% complete`
              });
            }
          );
          
          toast.success('Files uploaded!', { id: uploadToast });
          
          // Add file information to the message for AI context
          const fileInfo = attachments.map(f => 
            `- ${f.name} (${(f.size / 1024).toFixed(1)} KB, type: ${f.type})`
          ).join('\n');

          let extractedContext = '';
          try {
            const extractedFiles = await extractAttachmentText(attachments);
            if (extractedFiles.length > 0) {
              const snippets = extractedFiles
                .map((f, idx) => {
                  const suffix = f.truncated ? '\n[Note: extraction was truncated due to safety limits.]' : '';
                  return `--- Extracted text ${idx + 1} from ${f.name} ---\n${f.text}${suffix}`;
                })
                .join('\n\n');
              extractedContext = `\n\n[Extracted file content for summarization]\n${snippets}`;
            }
          } catch (extractError) {
            console.error('Attachment text extraction failed:', extractError);
          }

          const summaryRequest = baseUserMessage || 'Please summarize the attached file(s) in concise bullet points and highlight key takeaways.';
          aiPromptContent = `${summaryRequest}\n\n[User has attached ${attachments.length} file(s):\n${fileInfo}]${extractedContext}`;

          const attachmentLine = `Attached ${attachments.length} file(s): ${attachments.map((f) => f.name).join(', ')}`;
          visibleUserMessage = baseUserMessage
            ? `${baseUserMessage}\n\n${attachmentLine}`
            : attachmentLine;
          
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(uploadError instanceof Error ? uploadError.message : 'Failed to upload files', { 
            id: uploadToast 
          });
          setIsUploading(false);
          setUploadProgress(0);
          setIsAILoading(false);
          return;
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }

      if (!visibleUserMessage) {
        visibleUserMessage = 'Please summarize the attached file(s).';
      }

      if (!aiPromptContent) {
        aiPromptContent = visibleUserMessage;
      }

      // Add user message to AI conversation history
      const userMsg: GroqMessage = { role: 'user', content: visibleUserMessage };
      const historyBeforeResponse = [...aiMessages, userMsg];
      setAiMessages(historyBeforeResponse);
      
      // Get AI response
      const aiResponse = await getChatCompletion(aiPromptContent, aiMessages, currentUserRole as any);
      
      // Add AI response to history
      const aiMsg: GroqMessage = { role: 'assistant', content: aiResponse };
      setAiMessages([...historyBeforeResponse, aiMsg]);
      
      setMessage('');
      setTranslatedMessage('');
      setSelectedFiles([]);
      setFileCacheIds([]);
      scrollToBottom();
      toast.success('AI response received!');
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to get AI response.');
    } finally {
      setIsAILoading(false);
    }
  };

  const handleSummarizeLease = async () => {
    if (!leaseText.trim()) {
      toast.error('Please enter lease text');
      return;
    }

    setIsProcessingLease(true);
    try {
      const summary = await summarizeLeaseDQWithGroq(leaseText);
      setLeaseSummary(summary);
      toast.success('Lease summarized successfully!');
    } catch (error) {
      console.error('Error summarizing lease:', error);
      toast.error('Failed to summarize lease');
    } finally {
      setIsProcessingLease(false);
    }
  };

  const getParticipantName = (participantId: string) => {
    if (participantId === 'owner@test.com') return 'Property Owner';
    if (participantId === 'manager@test.com') return 'Property Manager';
    
    const participant = availableUsers.find(u => u.id === participantId || u.email === participantId);
    return participant?.full_name || 'User';
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const managerContact = availableUsers.find((u) => u.role === 'manager');
  const filteredConversations = normalizedSearch
    ? conversations.filter((conversation) => {
        const peerId = conversation.participants.find((p) => p !== currentUserId) || '';
        const peerName = getParticipantName(peerId);
        const text = `${conversation.title || ''} ${peerName} ${conversation.lastMessage || ''}`.toLowerCase();
        return text.includes(normalizedSearch);
      })
    : conversations;

  const filteredContacts = normalizedSearch
    ? availableUsers.filter((u) => {
        const text = `${u.full_name || ''} ${u.email || ''} ${u.role || ''}`.toLowerCase();
        return text.includes(normalizedSearch);
      })
    : [];

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-220px)]">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between"
        >
          <div>
            <h1 className="font-display text-3xl font-bold">Messages</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Logged in as: <span className="font-medium text-primary">{user.fullName}</span> ({currentUserRole})
              - Messages auto-translate to {language.toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center h-[calc(100%-80px)]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading conversations...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="xl:col-span-4"
            >
              <GlassCard className="h-full flex flex-col min-h-[420px] xl:min-h-[640px]">
                <div className="p-4 border-b border-white/5">
                  {currentUserRole === 'manager' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Select Owner
                      </label>
                      <select
                        value={selectedOwnerId || ''}
                        onChange={(e) => handleSelectOwner(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-white/10 text-foreground hover:border-primary/50 focus:border-primary focus:outline-none transition-colors"
                        disabled={managerOwnerOptions.length === 0}
                      >
                        <option value="" disabled>
                          {managerOwnerOptions.length === 0 ? 'No owners available' : 'Choose an owner...'}
                        </option>
                        {managerOwnerOptions.map((owner) => (
                          <option key={owner.id} value={owner.id}>
                            {owner.full_name}{owner.property_count !== undefined ? ` (${owner.property_count} properties)` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input-glass pl-12 w-full py-2"
                    />
                  </div>
                </div>

                {currentUserRole === 'manager' && filteredContacts.length > 0 && (
                  <div className="px-3 pt-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground px-2 pb-2">Start Chat By Name</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {filteredContacts.map((contact) => (
                        <button
                          key={`${contact.id}-${contact.email}`}
                          onClick={() => handleStartConversationWithUser(contact)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <p className="text-sm font-medium truncate">{contact.full_name || contact.email}</p>
                          <p className="text-xs text-muted-foreground truncate">{contact.role} • {contact.email}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {currentUserRole === 'owner' && managerContact && (
                  <div className="px-3 pt-3">
                    <button
                      onClick={() => handleStartConversationWithUser(managerContact)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                      <p className="text-sm font-medium">Contact Manager</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {managerContact.full_name || managerContact.email || 'Property Manager'}
                      </p>
                    </button>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={cn(
                        'w-full p-4 rounded-xl text-left transition-all',
                        selectedConversation?.id === conversation.id
                          ? 'bg-primary/20 border border-primary/30'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <div className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center',
                            'bg-gradient-primary'
                          )}>
                            <User className="w-6 h-6 text-white" />
                          </div>
                          {conversation.online && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-card" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium truncate">
                              {conversation.title || getParticipantName(conversation.participants.find(p => p !== currentUserId) || '')}
                            </h4>
                            <span className="text-xs text-muted-foreground">{new Date(conversation.updated_at).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            Auto-translating
                          </p>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {translatedConversationLastMessages[conversation.id] || conversation.lastMessage}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {currentUserRole === 'tenant' && (
                  <div className="border-t border-white/5 p-3">
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <Heart className="w-4 h-4 text-destructive" />
                      <p className="text-sm font-medium">Favorite Homes</p>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {favoriteHomes.length === 0 && (
                        <p className="text-xs text-muted-foreground px-2">No favorites yet. Add homes from Find Homes.</p>
                      )}
                      {favoriteHomes.slice(0, 5).map((fav) => (
                        <div key={fav.id || `${fav.tenant_id}-${fav.unit_id}`} className="px-2 py-2 rounded-lg bg-muted/30">
                          <p className="text-sm font-medium truncate">{fav.property_name || 'Property'} • Unit {fav.unit_number || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground truncate">{fav.city || ''} {fav.address ? `• ${fav.address}` : ''}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="xl:col-span-8 min-h-0"
            >
              <GlassCard className="h-[calc(100vh-220px)] max-h-[calc(100vh-220px)] flex flex-col min-h-0 overflow-hidden">
                {selectedConversation ? (
                  <>
                    <div className="p-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center',
                          'bg-gradient-primary'
                        )}>
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {selectedConversation.title || getParticipantName(selectedConversation.participants.find(p => p !== currentUserId) || '')}
                          </h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Globe className="w-3 h-3" />
                            Auto-translating to {language.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowLeaseSummarizer(true)}
                          className="p-2 rounded-xl hover:bg-muted transition-colors"
                          title="AI Lease Summarizer"
                        >
                          <FileText className="w-5 h-5 text-primary" />
                        </button>
                        <button className="p-2 rounded-xl hover:bg-muted transition-colors">
                          <Phone className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <button className="p-2 rounded-xl hover:bg-muted transition-colors">
                          <Video className="w-5 h-5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                      {isAIMode ? (
                        // AI Chat Mode
                        aiMessages.length > 0 ? (
                          aiMessages.map((msg, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}
                            >
                              <div className={cn(
                                'max-w-[70%] p-4 rounded-2xl',
                                msg.role === 'user'
                                  ? 'bg-gradient-primary text-white rounded-br-sm'
                                  : 'bg-muted rounded-bl-sm'
                              )}>
                                <p className="text-sm">{msg.content}</p>
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>Start chatting with AI Assistant!</p>
                          </div>
                        )
                      ) : (
                        // Normal Chat Mode
                        translatedMessages.length > 0 ? (
                          translatedMessages.map((msg, index) => (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={cn('flex flex-col', msg.sender_id === currentUserId ? 'items-end' : 'items-start')}
                            >
                              <div className={cn(
                                'max-w-[70%] p-4 rounded-2xl',
                                msg.sender_id === currentUserId
                                  ? 'bg-gradient-primary text-white rounded-br-sm'
                                  : 'bg-muted rounded-bl-sm'
                              )}>
                                <p className="text-sm">{msg.content}</p>                                
                                {/* Display attachments */}
                                {msg.attachments && msg.attachments.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {msg.attachments.map((file: FileAttachment, fileIndex: number) => (
                                      <a
                                        key={fileIndex}
                                        href={file.url}
                                        download={file.name}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                          'flex items-center gap-2 p-2 rounded-lg text-xs',
                                          msg.sender_id === currentUserId
                                            ? 'bg-white/10 hover:bg-white/20 text-white'
                                            : 'bg-muted/50 hover:bg-muted'
                                        )}
                                      >
                                        <File className="w-3 h-3" />
                                        <span className="flex-1 truncate">{file.name}</span>
                                        <Download className="w-3 h-3" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {msg.isTranslated && msg.originalContent && msg.originalContent !== msg.content && (
                                  <div className={cn(
                                    'text-xs mt-2 p-2 rounded-lg',
                                    msg.sender_id === currentUserId 
                                      ? 'bg-white/10 text-white/70' 
                                      : 'bg-muted/50 text-muted-foreground'
                                  )}>
                                    <p className="flex items-center gap-1 mb-1 opacity-70">
                                      <Globe className="w-3 h-3" />
                                      Original:
                                    </p>
                                    <p className="italic">{msg.originalContent}</p>
                                  </div>
                                )}
                                <p className={cn(
                                  'text-xs mt-2',
                                  msg.sender_id === currentUserId ? 'text-white/60' : 'text-muted-foreground'
                                )}>
                                  {new Date(msg.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>No messages yet. Start the conversation!</p>
                          </div>
                        )
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t border-white/5">
                      <div className="mb-3 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setIsAIMode(!isAIMode);
                            if (!isAIMode) {
                              setAiMessages([]);
                            }
                          }}
                          className={cn(
                            'px-3 py-1 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                            isAIMode
                              ? 'bg-gradient-primary text-white'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          )}
                        >
                          <Sparkles className="w-4 h-4" />
                          {isAIMode ? 'AI Mode On' : 'AI Mode Off'}
                        </button>
                        {isAIMode && (
                          <span className="text-xs text-muted-foreground">
                            Talking to AI Assistant (can attach files for context)
                          </span>
                        )}
                      </div>

                      {/* Display selected files */}
                      {selectedFiles.length > 0 && (
                        <div className="mb-3 space-y-2">
                          <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
                            {selectedFiles.map((file, index) => (
                              <div key={index} className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg text-sm">
                                <File className="w-4 h-4 text-primary" />
                                <span className="max-w-[150px] truncate">{file.name}</span>
                                <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
                                <button
                                  onClick={() => removeFile(index)}
                                  className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                                  disabled={isUploading}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          {/* Upload progress indicator */}
                          {isUploading && (
                            <div className="px-2">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</span>
                              </div>
                              <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-primary transition-all duration-300"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <button 
                          className="p-2 rounded-xl hover:bg-muted transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                          title="Attach files"
                        >
                          <Paperclip className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder={isAIMode ? 'Ask AI Assistant...' : `Type in ${language.toUpperCase()}...`}
                            value={message}
                            onChange={handleMessageChange}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                isAIMode ? handleAISendMessage() : handleSendMessage();
                              }
                            }}
                            className="input-glass w-full pr-12"
                          />
                          <button className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Smile className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                          </button>
                        </div>
                        <button 
                          className="btn-primary p-3" 
                          onClick={isAIMode ? handleAISendMessage : handleSendMessage}
                          disabled={isAIMode ? (isAILoading || isUploading) : isUploading}
                          title={isUploading ? 'Uploading files...' : 'Send message'}
                        >
                          {(isAIMode && isAILoading) || isUploading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {translatedMessage && !isAIMode && (
                        <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                              <Globe className="w-3 h-3" />
                              <span>Translating {detectedLanguage.toUpperCase()} → {language.toUpperCase()}</span>
                            </p>
                            {isTranslating && (
                              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            )}
                          </div>
                          <p className="text-sm font-medium">{translatedMessage}</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <User className="w-16 h-16 text-muted-foreground opacity-50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Conversations</h3>
                    <p className="text-muted-foreground">
                      {conversations.length === 0 
                        ? 'No conversations available. Add tenants to start chatting.'
                        : 'Select a conversation to start messaging'}
                    </p>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        )}
      </div>

      {/* AI Lease Summarizer Modal */}
      {showLeaseSummarizer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  AI Lease Summarizer
                </h2>
                <button
                  onClick={() => {
                    setShowLeaseSummarizer(false);
                    setLeaseText('');
                    setLeaseSummary(null);
                  }}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!leaseSummary ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Paste Your Lease Text</label>
                    <textarea
                      value={leaseText}
                      onChange={(e) => setLeaseText(e.target.value)}
                      placeholder="Paste your lease agreement here..."
                      rows={10}
                      className="input-glass w-full resize-none font-mono text-sm"
                    />
                  </div>
                  <button
                    onClick={handleSummarizeLease}
                    disabled={isProcessingLease || !leaseText.trim()}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessingLease ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Summarize Lease
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold mb-2">Summary</h3>
                    <p className="text-sm text-muted-foreground">{leaseSummary.summary}</p>
                  </div>

                  {leaseSummary.keyPoints && leaseSummary.keyPoints.length > 0 && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h3 className="font-semibold mb-2">Key Points</h3>
                      <ul className="space-y-1 text-sm">
                        {leaseSummary.keyPoints.map((point: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {leaseSummary.warnings && leaseSummary.warnings.length > 0 && (
                    <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                      <h3 className="font-semibold mb-2 text-warning">Warnings</h3>
                      <ul className="space-y-1 text-sm">
                        {leaseSummary.warnings.map((warning: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-warning mt-1">•</span>
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {leaseSummary.recommendations && leaseSummary.recommendations.length > 0 && (
                    <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                      <h3 className="font-semibold mb-2 text-success">Recommendations</h3>
                      <ul className="space-y-1 text-sm">
                        {leaseSummary.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-success mt-1">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setLeaseText('');
                        setLeaseSummary(null);
                      }}
                      className="btn-ghost flex-1"
                    >
                      Summarize Different Lease
                    </button>
                    <button
                      onClick={() => {
                        setShowLeaseSummarizer(false);
                        setLeaseText('');
                        setLeaseSummary(null);
                      }}
                      className="btn-primary flex-1"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Messages;
