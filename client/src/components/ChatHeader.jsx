import { X, Users } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { formatDistanceToNow } from 'date-fns';

function ChatHeader() {
  const { selectedUser, setSelectedUser, typingUsers, lastActive } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const getLastActive = useCallback((userId) => {
    const lastActiveTime = lastActive[userId];
    if (!lastActiveTime) return 'Offline';
    return `Last seen ${formatDistanceToNow(new Date(lastActiveTime))} ago`;
  }, [lastActive]);

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              {selectedUser.__isGroup ? (
                <div className="w-full h-full bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xl font-medium">#</span>
                </div>
              ) : (
                <img 
                  src={selectedUser?.profilePic || "https://static.vecteezy.com/system/resources/previews/002/318/271/original/user-profile-icon-free-vector.jpg"} 
                  alt={selectedUser.fullName} 
                  className="w-full h-full object-cover rounded-full"
                />
              )}
            </div>
          </div>

          {/* User/Group info */}
          <div>
            <h3 className="font-medium">{selectedUser.fullName || selectedUser.name}</h3>
            <p className="text-sm text-base-content/70">
              {selectedUser.__isGroup ? (
                <span className="flex items-center gap-1">
                  <span>{selectedUser.members?.length || 0} members • </span>
                  <span>
                    {selectedUser.members?.filter(m => onlineUsers.includes(m._id)).length || 0} online
                  </span>
                  {typingUsers.size > 0 && (
                    <span className="text-xs italic ml-2">
                      {Array.from(typingUsers).length} typing...
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {onlineUsers.includes(selectedUser._id) ? (
                    <>
                      <span className="w-2 h-2 bg-green-500 rounded-full"/>
                      <span>Online</span>
                      {typingUsers.has(selectedUser._id) && (
                        <span className="text-xs italic">typing...</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 bg-gray-300 rounded-full"/>
                      <span>
                        {getLastActive(selectedUser._id)}
                      </span>
                    </>
                  )}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedUser.__isGroup && (
            <button 
              onClick={() => setShowGroupInfo(prev => !prev)}
              className="p-2 hover:bg-base-200 rounded-full transition-colors"
              title="Group members"
            >
              <Users size={20} />
            </button>
          )}
          <button 
            onClick={() => setSelectedUser(null)}
            className="p-2 hover:bg-base-200 rounded-full transition-colors"
            title="Close chat"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      
      {/* Group Info Panel */}
      {selectedUser.__isGroup && showGroupInfo && (
        <div className="mt-3 pt-3 border-t border-base-300">
          <h4 className="font-medium mb-2">Group Members</h4>
          <div className="max-h-40 overflow-y-auto">
            {selectedUser.members?.map(member => (
              <div key={member._id} className="flex items-center gap-2 py-1.5 px-2 hover:bg-base-100 rounded">
                <img 
                  src={member.profilePic || "https://static.vecteezy.com/system/resources/previews/002/318/271/original/user-profile-icon-free-vector.jpg"}
                  alt={member.fullName || member.username}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-sm flex-1">{member.fullName || member.username}</span>
                {onlineUsers.includes(member._id) ? (
                  <span className="text-xs text-green-500">online</span>
                ) : (
                  <span className="text-xs text-gray-400">{getLastActive(member._id)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatHeader;