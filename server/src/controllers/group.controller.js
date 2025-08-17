import Group from '../models/group.model.js';
import User from '../models/user.model.js';

export const leaveGroup = async (req,res)=>{
    try{
        const userId = req.user._id;
        const {groupId} = req.params;
        const group = await Group.findById(groupId);
        if(!group) return res.status(404).json({message:'Group not found'});
        if(!group.members.includes(userId)){
            return res.status(400).json({message:'Not a member of this group'});
        }
        if(group.createdBy.toString() === userId.toString()){
            return res.status(400).json({message:'Group creator cannot leave the group'});
        }
        group.members = group.members.filter(id => id.toString() !== userId.toString());
        await group.save();
        const populatedGroup = await Group.findById(groupId)
            .populate('members', 'username fullName profilePic')
            .populate('createdBy', 'username fullName');
        res.status(200).json(populatedGroup);
    }catch(e){
        console.error(e);
        res.status(500).json({message:'Internal Server Error'})
    }
}

export const createGroup = async (req,res)=>{
    try{
        const {name,description,members=[]} = req.body;
        if(!name) return res.status(400).json({message:'Group name is required'});
        
        const createdBy = req.user._id;
        const group = new Group({
            name,
            description,
            members:[...new Set([...members, createdBy])],
            createdBy
        });
        await group.save();
        
        const populatedGroup = await Group.findById(group._id)
            .populate('members', 'username fullName profilePic')
            .populate('createdBy', 'username fullName');
        res.status(201).json(populatedGroup);
    }catch(e){
        console.error(e);
        res.status(500).json({message:'Internal Server Error'})
    }
}

export const getMyGroups = async (req,res)=>{
    try{
        const userId = req.user._id;
        const groups = await Group.find({members: userId})
            .populate('members', 'username fullName profilePic')
            .populate('createdBy', 'username fullName');
        res.status(200).json(groups);
    }catch(e){
        console.error(e);
        res.status(500).json({message:'Internal Server Error'})
    }
}

export const joinGroup = async (req,res)=>{
    try{
        const userId = req.user._id;
        const {groupId} = req.params;
        const group = await Group.findById(groupId);
        if(!group) return res.status(404).json({message:'Group not found'});
        if(group.members.includes(userId)){
            return res.status(400).json({message:'Already a member'});
        }
        group.members.push(userId);
        await group.save();
        const populatedGroup = await Group.findById(groupId)
            .populate('members', 'username fullName profilePic')
            .populate('createdBy', 'username fullName');
        res.status(200).json(populatedGroup);
    }catch(e){
        console.error(e);
        res.status(500).json({message:'Internal Server Error'})
    }
}
