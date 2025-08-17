import React, { useRef, useState, useEffect } from 'react'
import { Image, Send, X, Paperclip, Reply, ArrowUp } from 'lucide-react'
import { useChatStore } from '../store/useChatStore'
import { useAuthStore } from '../store/useAuthStore'
import toast from 'react-hot-toast'

function MessageInput() {
  const [text, setText] = useState("")
  const [imagePreview, setImagePreview] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  const [fileUploadProgress, setFileUploadProgress] = useState(0)
  const fileInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const {sendMessage, selectedUser, messages, setSelectedUser, setTypingStatus, uploadFile, replyingTo, clearReplyingTo} = useChatStore()
  const {socket, authUser} = useAuthStore();

  // Handle typing indicator
  useEffect(() => {
    if (!selectedUser || !socket || !authUser) return;

    if (text && !isTyping) {
      setIsTyping(true);
      socket.emit('typing', { 
        receiverId: selectedUser._id,
        isGroup: selectedUser.__isGroup 
      });
      
      // Emit user activity
      socket.emit('activity');
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socket.emit('stopTyping', { 
          receiverId: selectedUser._id,
          isGroup: selectedUser.__isGroup
        });
      }
    }, 1000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [text, isTyping, socket, authUser, selectedUser]);

  const handleSend = async (payload)=>{
    if(!selectedUser) return;
    
    try {
      if(selectedUser.__isGroup){
        // Group message via socket
        if(!socket){ 
          toast.error('Socket not connected'); 
          return;
        }

        const msgPayload = {
          groupId: selectedUser._id,
          senderId: authUser._id,
          text: payload.text,
          image: payload.image,
          fileName: payload.fileName || null,
          isEncrypted: payload.isEncrypted || false,
          nonce: payload.nonce || null,
          algorithm: payload.algorithm || null
        };

        socket.emit('groupMessage', msgPayload);
        
        // Append locally
        const localMsg = {
          ...msgPayload,
          _id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          senderId: authUser._id
        };
        
        setTimeout(()=>{
          const curr = useChatStore.getState().messages || [];
          useChatStore.setState({messages:[...curr, localMsg]});
        },50);
      } else {
        // Personal message via API
        await sendMessage({
          ...payload,
          isGroupMessage: false
        });
      }
      
      // Clear inputs
      setText('');
      setImagePreview(null);
      if(fileInputRef.current) fileInputRef.current.value = '';
      
    } catch(e) {
      console.error('Send message error:', e);
      toast.error(selectedUser.__isGroup ? 
        'Failed to send group message' : 
        'Failed to send message'
      );
    }
  }


  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Process each selected file
    for (const file of files) {
      try {
        // Get the relative path if it exists (for files from directory)
        const relativePath = file.webkitRelativePath || '';
        // Use full path for files from directory, otherwise just filename
        const displayName = relativePath || file.name;
        // Extract just the filename for the final save
        const fileName = file.name.split('\\').pop().split('/').pop();

        if (file.type.startsWith("image/")) {
          // Handle image preview
          const reader = new FileReader();
          reader.onloadend = () => {
            setImagePreview(reader.result);
          };
          reader.readAsDataURL(file);
        } else {
          // Handle other file types
          setFileUploadProgress(0);
          const uploadedUrl = await uploadFile(file, (progress) => {
            setFileUploadProgress(progress);
          });
          
          // Get human-readable file size
          const size = file.size < 1024 * 1024 
            ? `${Math.round(file.size / 1024)}KB`
            : `${Math.round(file.size / (1024 * 1024))}MB`;
          
          // Send file message with path (if from directory) and size
          await handleSend({
            text: `Shared a file: ${displayName} (${size})`,
            image: uploadedUrl,
            fileName: fileName
          });
          
          setFileUploadProgress(0);
        }
      } catch (error) {
        console.error('File upload error:', error);
        toast.error(`Failed to upload ${file.name}: ${error.message || 'Unknown error'}`);
        setFileUploadProgress(0);
      }
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const removeImage=()=>{
    setImagePreview(null)
    if(fileInputRef.current) fileInputRef.current.value=""
  }

  const handleSendMessage=async(e)=>{
    e.preventDefault();
    if(!text.trim() && !imagePreview) return;
    try{
      await sendMessage({
        text:text.trim(),
        image:imagePreview,
        replyTo: replyingTo ? {
          id: replyingTo._id,
          text: replyingTo.text
        } : null
      })
      setText("")
      setImagePreview(null)
      clearReplyingTo()
      if(fileInputRef.current) fileInputRef.current.value=""
    }
    catch(error){
      console.log(error)
    }
  }
  return (
    <div className='p-4 w-full'>
      {replyingTo && (
        <div className="mb-3 flex items-center gap-2 p-2 border border-zinc-700 rounded-lg">
          <Reply className="size-4 text-blue-500" />
          <div className="flex-1">
            <p className="text-sm text-zinc-400">Replying to</p>
            <p className="text-sm truncate">{replyingTo.text}</p>
          </div>
          <button
            onClick={clearReplyingTo}
            className="w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
            type="button"
          >
            <X className="size-3" />
          </button>
        </div>
      )}
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="*/*"
            multiple
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`hidden sm:flex btn btn-circle
                       ${imagePreview ? "text-emerald-500" : "text-zinc-400 hover:text-emerald-500"}`}
              onClick={() => {
                const input = fileInputRef.current;
                input.removeAttribute('webkitdirectory');
                input.removeAttribute('directory');
                input.accept = "image/*";
                input?.click();
              }}
              title="Share image"
            >
              <Image size={20} className="stroke-current" />
            </button>

            <button
              type="button"
              className="hidden sm:flex btn btn-circle text-zinc-400 hover:text-blue-600"
              onClick={() => {
                const input = fileInputRef.current;
                input.accept = "*/*";
                input.multiple = true; // allow returning files inside the selected folder
                input?.click();
              }}
              title="Browse folder"
            >
              <Paperclip size={20} className="stroke-current" />
            </button>

          </div>
        </div>

        {fileUploadProgress > 0 && (
          <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${fileUploadProgress}%` }}
            />
          </div>
        )}

        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview && fileUploadProgress > 0}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  )
}

export default MessageInput