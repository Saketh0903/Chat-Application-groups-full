import React, { useEffect, useState, useCallback } from 'react'
import axios from '../lib/axios';
import { useChatStore } from '../store/useChatStore'
import toast from 'react-hot-toast';
import { Users } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import SidebarSkeleton from './skeletons/SidebarSkeleton';

function Sidebar() {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading, getMyGroups } = useChatStore();

  const handleCreateGroup = useCallback(async (name, members) => {
    try {
      const store = useChatStore.getState();
      await store.createGroup({ name, members });
      await store.getMyGroups();
    } catch (error) {
      throw error;
    }
  }, []);

  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Prepare users list when opening modal
  useEffect(() => {
    if (showCreateGroup) {
      const currentUser = useAuthStore.getState().authUser;
      const filteredUsers = users.filter(u => u._id !== currentUser._id);
      setAllUsers(filteredUsers);
    } else {
      setSelectedMembers([]);
      setNewGroupName('');
    }
  }, [showCreateGroup, users]);

  useEffect(() => {
    getMyGroups();
  }, [getMyGroups]);

  const { onlineUsers } = useAuthStore()

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = showOnlineOnly ? users.filter(user => onlineUsers.includes(user._id)) : users

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>
        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`
              w-full p-3 flex items-center gap-3
              hover:bg-base-300 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
            `}
          >
            <div className="relative mx-auto lg:mx-0">
              <img
                src={user?.profilePic || "https://static.vecteezy.com/system/resources/previews/002/318/271/original/user-profile-icon-free-vector.jpg"}
                alt={user.name}
                className="size-12 object-cover rounded-full"
              />
              {onlineUsers.includes(user._id) && (
                <span
                  className="absolute bottom-0 right-0 size-3 bg-green-500 
                  rounded-full ring-2 ring-zinc-900"
                />
              )}
            </div>

            {/* User info - only visible on larger screens */}
            <div className="hidden lg:block text-left min-w-0">
              <div className="font-medium truncate">{user.fullName}</div>
              <div className="text-sm text-zinc-400">
                {onlineUsers.includes(user._id) ? "Online" : "Offline"}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className='mt-6 px-4 lg:block'>
        <div className='flex items-center justify-between mb-2'>
          <h4 className='text-sm font-semibold'>Groups</h4>
          <button className='text-xs text-blue-500 hover:text-blue-600 font-medium' onClick={() => { setShowCreateGroup(true); }}>+ Create Group</button>
        </div>

        <div className='flex flex-col gap-2'>
          {/** render groups from store **/}
          {useChatStore.getState().groups && useChatStore.getState().groups.map(g => (
            <div 
              key={g._id} 
              className={`flex items-center gap-2 p-2 cursor-pointer rounded-md hover:bg-base-300 transition-colors
                ${selectedUser?._id === g._id ? 'bg-base-300' : ''}`}
              onClick={() => { 
                setSelectedUser({ __isGroup: true, ...g }); 
                useChatStore.getState().getMyGroups(); 
              }}
            >
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm font-medium">#</span>
              </div>
              <div className="flex-grow">
                <div className="text-sm font-medium">{g.name}</div>
                <div className="text-xs text-gray-500">{g.members?.length || 0} members</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal dialog for creating a group - appears centered and overlays the app */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowCreateGroup(false); setNewGroupName(''); setSelectedMembers([]); }} />
          <div className="bg-base-200 w-full max-w-lg p-6 rounded-lg z-10 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Create Group</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Group Name</label>
              <input
                className='w-full p-2 input input-sm input-bordered rounded-md'
                placeholder='Enter group name'
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select Members ({selectedMembers.length} selected)</label>
              <div className='max-h-64 overflow-auto border border-base-300 rounded-md p-2'>
                {allUsers.length === 0 ? (
                  <div className="text-center py-4 opacity-70">No users available</div>
                ) : (
                  allUsers.map(u => (
                    <div key={u._id}
                      className='flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer'
                      onClick={() => {
                        const isSelected = selectedMembers.includes(u._id);
                        if (isSelected) {
                          setSelectedMembers(prev => prev.filter(id => id !== u._id));
                        } else {
                          setSelectedMembers(prev => [...prev, u._id]);
                        }
                      }}
                    >
                      <input
                        type='checkbox'
                        className='mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded cursor-pointer'
                        checked={selectedMembers.includes(u._id)}
                        onChange={() => { }}
                      />
                      <div className="flex items-center flex-1">
                        <img
                          src={u.profilePic || "https://static.vecteezy.com/system/resources/previews/002/318/271/original/user-profile-icon-free-vector.jpg"}
                          alt={u.fullName || u.username}
                          className="w-8 h-8 rounded-full mr-2"
                        />
                        <span className="text-sm font-medium">{u.fullName || u.username}</span>
                      </div>
                    </div>)
                ))}
              </div>
            </div>

            <div className='flex gap-3 justify-end mt-4'>
              <button
                className='btn btn-sm btn-ghost'
                onClick={() => {
                  setShowCreateGroup(false);
                  setNewGroupName('');
                  setSelectedMembers([]);
                }}
              >
                Cancel
              </button>
              <button
                className={`btn btn-sm btn-primary ${(!newGroupName.trim() || selectedMembers.length === 0) ? 'btn-disabled' : ''}`}
                disabled={!newGroupName.trim() || selectedMembers.length === 0}
                onClick={async () => {
                  if (!newGroupName.trim()) {
                    toast.error('Please enter a group name');
                    return;
                  }
                  if (selectedMembers.length === 0) {
                    toast.error('Please select at least one member');
                    return;
                  }
                  try {
                    console.log('Attempting to create group:', { name: newGroupName.trim(), members: selectedMembers });
                    await handleCreateGroup(newGroupName.trim(), selectedMembers);
                    setShowCreateGroup(false);
                    setNewGroupName('');
                    setSelectedMembers([]);
                  } catch (e) {
                    console.error('Group creation error:', e);
                    toast.error(e.response?.data?.message || 'Failed to create group');
                  }
                }}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar