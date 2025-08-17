import { getKeyPair, encryptForPeer, decryptFromPeer } from "../lib/e2ee";
import { create } from "zustand";
import toast from "react-hot-toast";
import axiosInstance from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore=create((set,get)=>({
    messages:[],
    users:[],
    selectedUser:null,
    isUsersLoading:false,
    isMessagesLoading:false,
    groups:[],
    isGroupsLoading:false,
    typingUsers: new Set(),
    lastActive: {},
    replyingTo: null, // Message being replied to

    getUsers:async()=>{
        set({isUsersLoading:true})
        try{
            const response=await axiosInstance.get("/messages/users")
            set({users:response.data})
        }
        catch(error){
            toast.error(error.response.data.message)
        }
        finally{
            set({isUsersLoading:false})
        }
    },
    getMessages:async(userId)=>{
        set({isMessagesLoading:true})
        try{
            const response = await axiosInstance.get(`/messages/${userId}`);
            console.log('Messages received:', response.data);
            set({messages:response.data});
        }
        catch(error){
            console.error('Error fetching messages:', error);
            toast.error(error.response?.data?.message || 'Failed to load messages');
            set({messages: []});
        }
        finally{
            set({isMessagesLoading:false});
        }
    },
    sendMessage: async (messageData) => {
        const {selectedUser, messages}=get()
        console.log('Sending message:', messageData)
        try{
            const isGroupMessage = selectedUser.__isGroup;
            const response = await axiosInstance.post(
                `messages/send/${selectedUser._id}`,
                {
                    ...messageData,
                    isGroupMessage
                }
            );
            
            set({messages: [...messages, response.data]})
            return response.data;
        }
        catch(error){
            console.error('Send message error:', error);
            toast.error(error.response?.data?.message || 'Failed to send message')
        }
    },
    leaveGroup:async(groupId)=>{
        try{
            const res = await axiosInstance.post(`/api/groups/leave/${groupId}`);
            set({
                groups: get().groups.filter(g => g._id !== groupId),
                selectedUser: null
            });
            toast.success('Left the group successfully');
            return res.data;
        }catch(e){
            toast.error(e.response?.data?.message || 'Failed to leave group');
            throw e;
        }
    },
    subscribeToMessages:()=>{
        if(!get().selectedUser) return;
        
        const socket = useAuthStore.getState().socket;
        const selectedUser = get().selectedUser;

        const handleIncomingMessage = (message) => {
            console.log('Incoming message:', message);

            // Normalize senderId: could be populated object or id string
            let normalized = { ...message };
            try {
                if (message && message.senderId) {
                    // if populated object
                    if (typeof message.senderId === 'object' && message.senderId._id) {
                        normalized.senderId = { ...message.senderId };
                    } else {
                        // keep as string
                        normalized.senderId = String(message.senderId);
                    }
                }
            } catch (e) { console.error('Normalization error', e); }

            // Decrypt if needed
            try {
                if (normalized.isEncrypted && selectedUser?.publicKey) {
                    const kp = getKeyPair();
                    const peerPK = String(normalized.senderId) === useAuthStore.getState().authUser._id 
                        ? selectedUser.publicKey 
                        : selectedUser.publicKey;
                    const plaintext = decryptFromPeer(normalized.text, normalized.nonce, peerPK, kp.secretKey);
                    normalized = { ...normalized, __plaintext: plaintext };
                }
            } catch (e) { console.error('Decrypt incoming failed', e); }

            // Append based on chat type
            if (selectedUser?.__isGroup) {
                if (String(normalized.groupId) === String(selectedUser._id)) {
                    set(state => ({ messages: [...state.messages, normalized] }));
                }
            } else {
                // direct messages: append if sender is the selected user
                if (String(normalized.senderId) === String(selectedUser._id) || String(normalized.receiverId) === String(selectedUser._id)) {
                    set(state => ({ messages: [...state.messages, normalized] }));
                }
            }
        };

        // Message handler for both single and group message events
        socket.on("newMessage", handleIncomingMessage);
        socket.on("newGroupMessage", handleIncomingMessage);

        // Typing indicators
        socket.on("userTyping", ({ userId }) => {
            if ((selectedUser.__isGroup && selectedUser.members.includes(userId)) ||
                (!selectedUser.__isGroup && userId === selectedUser._id)) {
                get().setTypingStatus(userId, true);
            }
        });

        socket.on("userStoppedTyping", ({ userId }) => {
            get().setTypingStatus(userId, false);
        });

        // User activity
        socket.on("userActive", ({ userId, timestamp }) => {
            get().updateLastActive(userId);
        });

        // Handle file progress
        socket.on("fileProgress", ({ progress }) => {
            set({ fileUploadProgress: progress });
        });
    },
    getMyGroups:async()=>{
        set({isGroupsLoading:true});
        try{
            const res = await axiosInstance.get('/groups/my');
            console.log('Fetched groups:', res.data);
            set({groups:res.data,isGroupsLoading:false});
        }catch(e){ 
            console.error('Error fetching groups:', e);
            set({isGroupsLoading:false}); 
        }
    },
    createGroup:async(payload)=>{
        try{
            console.log('Creating group with payload:', payload);
            const res = await axiosInstance.post('/groups', payload);
            console.log('Group created response:', res.data);
            set(state => ({
                groups: [...state.groups, res.data]
            }));
            await get().getMyGroups(); // Refresh groups list
            toast.success('Group created successfully');
            return res.data;
        }catch(e){ 
            console.error('Group creation error:', e);
            toast.error(e.response?.data?.message || 'Failed to create group');
            throw e;
        }
    },
    subscribeToGroupMessages:()=>{
        const socket = useAuthStore.getState().socket;
        const handler = (message) => {
            // reuse the main incoming handler by emitting it via the socket
            // the main subscribeToMessages already listens to newGroupMessage, so no-op here to avoid duplicates
            // kept for backward compatibility
            set(state => ({ messages: [...state.messages, message] }));
        };
        socket.on('newGroupMessage', handler);
        // store handler reference for cleanup
        set({ _groupMsgHandler: handler });
    },
    unsubscribeFromMessages:()=>{
        if(!get().selectedUser) return;
        const socket=useAuthStore.getState().socket
        // If we were in a group room, leave it so we don't receive members-only events
        try{
            const prev = get().selectedUser;
            if(prev && prev.__isGroup && socket) {
                socket.emit('leaveGroup', prev._id);
            }
        }catch(e){console.error('leaveGroup emit failed',e)}

        socket.off("newMessage")
        socket.off("newGroupMessage", get()._groupMsgHandler)
    },
    setSelectedUser:(selectedUser)=>{
                const prev = get().selectedUser;
                set({
                        selectedUser,
                        messages: [], // Clear messages when changing users/groups
                        isMessagesLoading: false,
                        typingUsers: new Set()
                });

                // Manage socket room membership for group chats
                try{
                    const socket = useAuthStore.getState().socket;
                    if(socket){
                        // leave previous group if any
                        if(prev && prev.__isGroup){
                            socket.emit('leaveGroup', prev._id);
                        }
                        // join new group if selected
                        if(selectedUser && selectedUser.__isGroup){
                            socket.emit('joinGroup', selectedUser._id);
                        }
                    }
                }catch(e){ console.error('join/leave group emit failed', e) }
    },
    
    // New methods for handling typing indicators and user activity
    setTypingStatus: (userId, isTyping) => {
        set(state => {
            const typingUsers = new Set(state.typingUsers);
            if (isTyping) {
                typingUsers.add(userId);
            } else {
                typingUsers.delete(userId);
            }
            return { typingUsers };
        });
    },

    updateLastActive: (userId) => {
        set(state => ({
            lastActive: {
                ...state.lastActive,
                [userId]: new Date().toISOString()
            }
        }));
    },

    // Method to handle file uploads in chat
    // accepts optional onProgress callback: (percent) => {}
    uploadFile: async (file, onProgress) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axiosInstance.post('/messages/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        if (typeof onProgress === 'function') onProgress(percentCompleted);
                        // also update store progress so components can read it
                        set({ fileUploadProgress: percentCompleted });
                    }
                }
            });
            // clear progress after small delay
            setTimeout(() => set({ fileUploadProgress: 0 }), 300);
            return response.data.url;
        } catch (error) {
            console.error('File upload error:', error);
            toast.error('Failed to upload file');
            set({ fileUploadProgress: 0 });
            throw error;
        }
    },

    // Reply handling methods
    setReplyingTo: (message) => {
        set({ replyingTo: message });
    },

    clearReplyingTo: () => {
        set({ replyingTo: null });
    }
}))