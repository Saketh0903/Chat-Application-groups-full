import React, { useEffect } from 'react'
import { useChatStore } from '../store/useChatStore'
import ChatHeader from './ChatHeader'
import MessageSkeleton from './skeletons/MessageSkeleton'
import { useAuthStore } from '../store/useAuthStore'
import { formatMessageTime } from '../lib/utils'
import MessageInput from './MessageInput'
import { useRef } from 'react'
import { Image as ImageIcon, Paperclip as FileIcon, Reply } from 'lucide-react'

function ChatContainer() {
  const {messages,getMessages,isMessagesLoading,selectedUser}=useChatStore()
  const {authUser}=useAuthStore()
  const {subscribeToMessages,unsubscribeFromMessages}=useChatStore()

  const messageEndRef = useRef(null);
  const messageRefs = useRef({});

  const scrollToMessage = (messageId) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
      // Add a temporary highlight effect
      messageElement.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'; // Light blue highlight
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
      }, 2000);
    }
  };

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    return () => {
      unsubscribeFromMessages();
    }
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if(isMessagesLoading){
    return(
      <div className='flex flex-1 flex-col overflow-auto'>
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    )
  }
  // API base for downloads (matches axiosInstance baseURL). Prefer explicit VITE_API_URL.
  const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.MODE === 'development' ? 'http://localhost:5000/api' : '/api');

  return (
    <div className='flex flex-1 flex-col overflow-auto'>
      <ChatHeader />
      <div className='flex-1 overflow-y-auto p-4 space-y-4'>
        {messages.map((message, index) => {
          // Normalize sender id: message.senderId may be a populated object or an id string
          const rawSenderId = message?.senderId?._id ?? message?.senderId;
          const senderIdStr = rawSenderId ? String(rawSenderId) : null;
          const authIdStr = authUser?._id ? String(authUser._id) : null;
          const isOwn = authIdStr && senderIdStr && authIdStr === senderIdStr;

          return(
            <div 
              key={message._id} 
              className={`chat group ${isOwn ? "chat-end" : "chat-start"}`} 
              ref={(el) => {
                messageRefs.current[message._id] = el;
                if (messages.length - 1 === index) messageEndRef.current = el;
              }}
            >
              <div className='chat-image avatar'>
                <div className='size-10 rounded-full border'>
                  <img src={isOwn ? (authUser.profilePic || "https://static.vecteezy.com/system/resources/previews/002/318/271/original/user-profile-icon-free-vector.jpg") : (selectedUser.profilePic||"https://static.vecteezy.com/system/resources/previews/002/318/271/original/user-profile-icon-free-vector.jpg")} alt="" />
                </div>
              </div>
              <div className='chat-header mb-1 flex items-center gap-2'>
                <time className='text-xs opacity-50'>{formatMessageTime(message.createdAt)}</time>
                <button 
                  onClick={() => useChatStore.getState().setReplyingTo(message)}
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
                >
                  <Reply size={14} />
                  <span>Reply</span>
                </button>
              </div>
              <div className='chat-bubble flex flex-col'>
                {message.replyTo && (
                  <button
                    onClick={() => scrollToMessage(message.replyTo.messageId)}
                    className="mb-1 text-sm text-zinc-400 border-l-2 border-zinc-500 pl-2 hover:bg-zinc-700/10 rounded transition-colors text-left"
                  >
                    <p className="truncate">{message.replyTo.text}</p>
                  </button>
                )}
                {message.image && (
                  // If there's a fileName, treat it as a downloadable file; otherwise show the image preview
                  message.fileName ? (
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            console.log('Starting download for:', message.fileName);
                            const downloadUrl = `${API_BASE}/messages/download?url=${encodeURIComponent(message.image)}&filename=${encodeURIComponent(message.fileName)}`;
                            console.log('Download URL:', downloadUrl);
                            
                            const resp = await fetch(downloadUrl, { 
                              credentials: 'include',
                              headers: {
                                'Accept': '*/*'
                              },
                              mode: 'cors'
                            });
                            
                            if (!resp.ok) {
                              let errorMessage;
                              try {
                                const errorText = await resp.text();
                                console.error('Download response not OK:', resp.status, errorText);
                                errorMessage = errorText;
                              } catch (e) {
                                errorMessage = 'Unknown error occurred';
                              }
                              throw new Error(`Download failed (${resp.status}): ${errorMessage}`);
                            }
                            
                            const blob = await resp.blob();
                            if (blob.size === 0) {
                              throw new Error('Downloaded file is empty');
                            }
                            
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.style.display = 'none';
                            a.href = url;
                            a.download = message.fileName || 'download';
                            document.body.appendChild(a);
                            a.click();
                            setTimeout(() => {
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(url);
                            }, 300);
                          } catch (e) {
                            console.error('Download error:', e);
                            alert('Failed to download file: ' + e.message);
                          }
                        }}
                        className="inline-flex items-center gap-2 text-sm text-blue-600 underline hover:text-blue-800"
                      >
                        <FileIcon size={16} />
                        <span className="truncate max-w-[140px]">{message.fileName}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => window.open(message.image, '_blank')}
                        title="Open in new tab"
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        Open
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(message.image);
                            alert('File URL copied to clipboard');
                          } catch (err) {
                            console.error('Copy failed', err);
                            alert('Failed to copy URL');
                          }
                        }}
                        title="Copy URL"
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        Copy URL
                      </button>
                    </div>
                  ) : (
                    <div className="relative inline-block mb-2">
                      <img src={message.image} alt={message.text || 'image'} className='sm:max-w-[200px] rounded-md' />
                      <div className="absolute top-1 left-1 bg-white/80 rounded p-0.5">
                        <ImageIcon size={14} />
                      </div>
                    </div>
                  )
                )}
                {message.text && <p>{message.__plaintext ?? message.text}</p>}
              </div>
            </div>
          )
        })}
      </div>
      <MessageInput />
    </div>
  )
}

export default ChatContainer