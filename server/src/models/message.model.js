import mongoose from "mongoose";

const messageSchema=new mongoose.Schema({
    senderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    receiverId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:false
    },
    groupId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Group',
        required:false
    },
    text:{
        type:String
    },
    image:{
        type:String
    },
    fileName:{
        type:String,
        default:null
    },
    // E2EE fields (for text payload)
    isEncrypted:{
        type:Boolean,
        default:false
    },
    nonce:{
        type:String,
        default:null
    },
    algorithm:{
        type:String,
        default:null
    },
    replyTo:{
        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message'
        },
        text: String
    }
},
{timestamps:true}
)

const Message=mongoose.model("Message",messageSchema)

export default Message