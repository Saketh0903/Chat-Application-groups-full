import React from 'react';
import { useChatStore } from '../store/useChatStore';
import toast from 'react-hot-toast';

function CreateGroupModal({ isOpen, onClose, allUsers, selectedMembers, setSelectedMembers, newGroupName, setNewGroupName, handleCreateGroup }) {
  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box relative">
        <h3 className="font-bold text-lg mb-4">Create New Group</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Group Name</label>
          <input 
            className='w-full input input-bordered' 
            placeholder='Enter group name' 
            value={newGroupName} 
            onChange={(e) => setNewGroupName(e.target.value)} 
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Select Members ({selectedMembers.length} selected)
          </label>
          <div className='max-h-64 overflow-auto border border-base-300 rounded-lg p-2'>
            {allUsers.length === 0 ? (
              <div className="text-center py-4 opacity-70">No users available</div>
            ) : (
              allUsers.map(u => (
                <div key={u._id} 
                  className='flex items-center p-2 hover:bg-base-200 rounded-lg cursor-pointer'
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
                    className='checkbox checkbox-sm mr-3' 
                    checked={selectedMembers.includes(u._id)} 
                    onChange={() => {}} // Handled by parent div click
                  />
                  <div className="flex items-center flex-1">
                    <img 
                      src={u.profilePic || "https://static.vecteezy.com/system/resources/previews/002/318/271/original/user-profile-icon-free-vector.jpg"}
                      alt={u.fullName || u.username}
                      className="w-8 h-8 rounded-full mr-2"
                    />
                    <span className="text-sm font-medium">{u.fullName || u.username}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="modal-action">
          <button 
            className='btn btn-ghost' 
            onClick={() => { 
              onClose();
              setNewGroupName(''); 
              setSelectedMembers([]); 
            }}
          >
            Cancel
          </button>
          <button 
            className={`btn btn-primary ${
              (!newGroupName.trim() || selectedMembers.length === 0) 
                ? 'btn-disabled' 
                : ''
            }`}
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
                await handleCreateGroup(
                  newGroupName.trim(),
                  selectedMembers
                );
                onClose();
                setNewGroupName('');
                setSelectedMembers([]);
                toast.success('Group created successfully');
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
  );
}

export default CreateGroupModal;
