import Message from "../models/message.model.js"
import User from "../models/user.model.js"
import Group from "../models/group.model.js"
import cloudinary from "../lib/cloudinary.js"
import axios from 'axios';
import { getReceiverSocketId, io } from "../lib/socket.js"

// Helper to upload buffer to cloudinary (for multer in-memory uploads)
async function uploadBufferToCloudinary(buffer, filename, mimetype = 'application/octet-stream') {
    // Clean filename - take only the last part of the path and sanitize it
    const cleanFileName = filename.split('\\').pop().split('/').pop().replace(/[^a-zA-Z0-9._-]/g, '_');

    // Convert buffer to base64 and include the correct mime type in the data URI
    const base64 = buffer.toString('base64');
    const dataUri = `data:${mimetype};base64,${base64}`;

    // Choose resource_type: 'image' for image/*, otherwise 'raw' for other files
    const resourceType = mimetype.startsWith('image/') ? 'image' : 'raw';

    console.log('Uploading file:', { 
        filename: cleanFileName, 
        mimetype, 
        resourceType,
        size: buffer.length 
    });

    const res = await cloudinary.uploader.upload(dataUri, {
        public_id: `chat_uploads/${Date.now()}_${cleanFileName}`,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true
    });

    console.log('Upload successful:', {
        originalName: filename,
        cloudinaryUrl: res.secure_url,
        resourceType: res.resource_type
    });

    return res;
}


export const getUsersForSidebar=async(req,res)=>{
    try{
        const loggedInUserId=req.user._id
        const filteredUsers=await User.find({_id:{$ne:loggedInUserId}}).select("-password")
        res.status(200).json(filteredUsers)
    }
    catch(error){
        console.log(error)
        res.status(500).json({message:"Internal Server Error"})
    }
}

export const getMessages=async(req,res)=>{
    try{
        const {id:targetId}=req.params
        const myId=req.user._id

        let messages;
        try {
            // Check if this is a group chat
            const group = await Group.findById(targetId);
            
            if (group) {
                // Check if user is a member of the group
                if (!group.members.includes(myId)) {
                    return res.status(403).json({ message: "You're not a member of this group" });
                }
                
                messages = await Message.find({ groupId: targetId })
                    .populate('senderId', 'username fullName profilePic')
                    .sort({ createdAt: 1 });
            } else {
                messages = await Message.find({
                    $or:[
                        {senderId:myId,receiverId:targetId},
                        {senderId:targetId,receiverId:myId}
                    ]
                }).populate('senderId', 'username fullName profilePic')
                  .sort({ createdAt: 1 });
            }
        } catch(err) {
            // If error in finding group, assume it's a direct message
            messages = await Message.find({
                $or:[
                    {senderId:myId,receiverId:targetId},
                    {senderId:targetId,receiverId:myId}
                ]
            }).populate('senderId', 'username fullName profilePic')
              .sort({ createdAt: 1 });
        }
        
        res.status(200).json(messages)
    }
    catch(error){
        console.error("Error in getMessages:", error)
        res.status(500).json({message:"Internal Server Error"})
    }
}

export const sendMessage = async(req,res) => {
    try {
        const { text, image, fileName, isEncrypted, nonce, algorithm, isGroupMessage, replyTo } = req.body;
        const { id: receiverId } = req.params;
        const senderId = req.user._id;
        
        let imageUrl = image;
        // Only upload to cloudinary if it's a data URL (not already a cloudinary URL)
        if(image && image.startsWith('data:')) {
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const message = new Message({
            senderId,
            receiverId,  // Set receiverId for personal messages
            text,
            image: imageUrl,
            fileName: fileName || null,
            isEncrypted,
            nonce,
            algorithm,
            replyTo: replyTo ? {
                messageId: replyTo.id,
                text: replyTo.text
            } : null
        });

        if (isGroupMessage) {
            message.groupId = receiverId;
            // Emit to all online group members
            const group = await Group.findById(receiverId).populate('members');
            const onlineGroupMembers = group.members
                .map(member => getReceiverSocketId(member._id.toString()))
                .filter(socketId => socketId && socketId !== getReceiverSocketId(senderId));

            // Save and emit
            await message.save();
            onlineGroupMembers.forEach(socketId => {
                io.to(socketId).emit("newMessage", {
                    ...message.toJSON(),
                    groupId: receiverId,
                    isGroupMessage: true
                });
            });
        } else {
            message.receiverId = receiverId;
            await message.save();
            const receiverSocketId = getReceiverSocketId(receiverId);
            if(receiverSocketId) {
                io.to(receiverSocketId).emit("newMessage", message);
            }
        }

        res.status(201).json(message);
    } catch(error) {
        console.error(error);
        res.status(500).json({message: "Internal Server Error"});
    }
}

export const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file provided' });
        }

        const file = req.file;
    const uploadResponse = await uploadBufferToCloudinary(file.buffer, file.originalname, file.mimetype);
        const url = uploadResponse.secure_url;
        res.status(200).json({ url });
    } catch (error) {
        console.error('Upload file error:', error);
        res.status(500).json({ message: 'Failed to upload file' });
    }
}

export const downloadFile = async (req, res) => {
    console.log('Download request received:', req.query);
    
    try {
        const { url, filename } = req.query;
        if (!url || !filename) {
            console.log('Missing parameters:', { url, filename });
            return res.status(400).send("URL and filename are required");
        }

        if (!(url.startsWith('http://') || url.startsWith('https://'))) {
            console.log('Invalid URL format:', url);
            return res.status(400).send("Invalid file URL format");
        }

        // Verify this is a Cloudinary URL
        if (!url.includes('cloudinary.com')) {
            console.log('Not a Cloudinary URL:', url);
            return res.status(403).send("Invalid file source");
        }

        console.log('Fetching file from:', url);
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'arraybuffer',
            headers: {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br'
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            timeout: 30000,
            validateStatus: function (status) {
                return status >= 200 && status < 300; // Accept all success status codes
            }
        });

        console.log('File fetched successfully:', {
            contentType: response.headers['content-type'],
            contentLength: response.headers['content-length'],
            status: response.status
        });

        // Clean filename
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        
        // Set permissive headers for download
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
        res.setHeader('Content-Length', response.data.length);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Accept-Ranges', 'bytes');

        console.log('Sending file to client, size:', response.data.length);
        res.status(200).send(response.data);
        console.log('File sent successfully');
    } catch (error) {
        console.error("Error downloading file:", {
            message: error.message,
            status: error.response?.status,
            headers: error.response?.headers,
            stack: error.stack
        });
        
        // Send an appropriate error message
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data instanceof Buffer
            ? `Error downloading file: ${error.message}`
            : error.response?.data?.toString() || 
              error.message || 
              "Error downloading file";
              
        res.status(statusCode).send(errorMessage);
    }
}
export const getGroupMessages = async (req,res)=>{
    try{
        const { groupId } = req.params;
        const messages = await Message.find({ groupId }).sort({createdAt:1});
        res.status(200).json(messages);
    }catch(error){
        console.error(error);
        res.status(500).json({message:'Internal Server Error'});
    }
}
