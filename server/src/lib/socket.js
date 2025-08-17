import {Server} from "socket.io"
import http from "http"
import express from "express"

import Message from '../models/message.model.js'
import Group from '../models/group.model.js'

const app=express()
const server=http.createServer(app)

const io=new Server(server,{
    cors:{
        origin:["http://localhost:5173"],
        credentials:true
    }
})

export function getReceiverSocketId(userId){
    return userSocketMap[userId]
}

const userSocketMap={}

io.on("connection",(socket)=>{
    console.log("A user connected",socket.id)
    const userId=socket.handshake.query.userId
    userSocketMap[userId]=socket.id
    
    // Emit online users and user active status
    io.emit("getOnlineUsers",Object.keys(userSocketMap))
    io.emit("userActive", { userId, timestamp: new Date().toISOString() })

    socket.on("disconnect",()=>{
        console.log("A user disconnected",socket.id)
        delete userSocketMap[userId]
        io.emit("getOnlineUsers",Object.keys(userSocketMap))
    })

    // Track user activity
    let typingTimeout
    socket.on("typing", ({ receiverId, isGroup }) => {
        if (isGroup) {
            socket.to(receiverId).emit("userTyping", { userId });
        } else {
            const receiverSocketId = userSocketMap[receiverId];
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("userTyping", { userId });
            }
        }

        // Clear existing timeout
        if (typingTimeout) clearTimeout(typingTimeout);

        // Set new timeout
        typingTimeout = setTimeout(() => {
            if (isGroup) {
                socket.to(receiverId).emit("userStoppedTyping", { userId });
            } else {
                const receiverSocketId = userSocketMap[receiverId];
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("userStoppedTyping", { userId });
                }
            }
        }, 2000); // Stop typing after 2 seconds of inactivity
    })

    socket.on("activity", () => {
        io.emit("userActive", {
            userId,
            timestamp: new Date().toISOString()
        });
    })

    // join a group room
    socket.on('joinGroup', async (groupId) => {
        try{
            socket.join(groupId)
            // optionally notify room members
            io.to(groupId).emit('groupJoined', {groupId, userId})
        }catch(e){ console.error(e) }
    })

    // leave group
    socket.on('leaveGroup', async(groupId)=>{
        try{ socket.leave(groupId); }catch(e){console.error(e)}
    })

    // handle group message (saves to DB and emits to room)
    socket.on('groupMessage', async (payload) => {
        // payload expected { groupId, senderId, text, image, fileName, e2ee }
        try{
            console.log('groupMessage payload received:', payload);
            const { groupId, senderId, text, image, fileName, e2ee } = payload;
            // ensure group exists
            const group = await Group.findById(groupId);
            if(!group) return;
            const message = new Message({
                senderId,
                receiverId: null,
                groupId,
                text,
                image,
                fileName: fileName || null,
                ... (e2ee || {})
            })
            await message.save();
            // Emit a plain object to avoid mongoose document serialization quirks
            const msgObj = (typeof message.toObject === 'function') ? message.toObject() : message;
            console.log('Emitting newGroupMessage:', { id: msgObj._id, image: msgObj.image, fileName: msgObj.fileName });
            io.to(groupId).emit('newGroupMessage', msgObj);
        }catch(e){ console.error('groupMessage error',e) }
    })

})

export {io,server,app}