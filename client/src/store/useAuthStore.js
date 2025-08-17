import { ensureKeyPair } from "../lib/e2ee";
import { create } from "zustand";
import axiosInstance from "../lib/axios.js";
import toast from "react-hot-toast";
import {io} from "socket.io-client"

const BASE_URL=import.meta.env.MODE==="development" ? "http://localhost:5000" : "/"

export const useAuthStore=create((set,get)=>({
    authUser:null,
    isSigningUp:false,
    isLoggingIn:false,
    isUpdatingProfile:false,
    isCheckingAuth:true,
    onlineUsers:[],
    socket:null,

    checkAuth:async()=>{
        try{
            const response=await axiosInstance.get("/auth/check")
            console.log(response.data)
            set({authUser:response.data});
            try {
                const kp = ensureKeyPair();
                await axiosInstance.put('/keys', { publicKey: kp.publicKey });
            } catch (e) { console.error('Failed to upload public key', e); };
            try {
                const kp = ensureKeyPair();
                await axiosInstance.put('/keys', { publicKey: kp.publicKey });
            } catch (e) { console.error('Failed to upload public key', e); };
            try {
                const kp = ensureKeyPair();
                await axiosInstance.put('/keys', { publicKey: kp.publicKey });
            } catch (e) { console.error('Failed to upload public key', e); }
            get().connectSocket()
        }
        catch(error){
            console.log(error)
            set({authUser:null})
        }
        finally{
            set({isCheckingAuth:false})
        }
    },
    signup: async (formData) => {
        set({isSigningUp:true})
        try {
            const response = await axiosInstance.post("/auth/signup", formData)
            toast.success("Account created successfully")
            set({isSigningUp:false})
            set({authUser:response.data});
            try {
                const kp = ensureKeyPair();
                await axiosInstance.put('/keys', { publicKey: kp.publicKey });
            } catch (e) { console.error('Failed to upload public key', e); };
            try {
                const kp = ensureKeyPair();
                await axiosInstance.put('/keys', { publicKey: kp.publicKey });
            } catch (e) { console.error('Failed to upload public key', e); };
            try {
                const kp = ensureKeyPair();
                await axiosInstance.put('/keys', { publicKey: kp.publicKey });
            } catch (e) { console.error('Failed to upload public key', e); }
            get().connectSocket()
        } catch (error) {
            toast.error(error.response.data.message)
            set({isSigningUp:false})
        }
    },
    login: async (formData) => {
        set({ isLoggingIn: true });
        console.log(formData);
        try {
        const res = await axiosInstance.post("/auth/login", formData);
        set({ authUser: res.data });
        toast.success("Logged in successfully");
        get().connectSocket();
        } catch (error) {
        toast.error(error.response.data.message);
        } finally {
        set({ isLoggingIn: false });
        }
  },
    logout: async () => {
        try {
            await axiosInstance.post("/auth/logout")
            toast.success("Logged out successfully")
            set({ authUser: null })
            get().disconnectSocket()
        } catch (error) {
            toast.error(error.response.data.message)
            console.log(error)
        }
    },
    updateProfile: async (formData) => {
        set({ isUpdatingProfile: true });
        try{
            const res = await axiosInstance.put("/auth/update-profile", formData)
            toast.success("Profile updated successfully")
            set({ authUser: res.data })
        }
        catch(error){
            toast.error(error.response.data.message)
        }
        finally{
            set({ isUpdatingProfile: false })
        }
    },
    connectSocket:()=>{
        const {authUser}=get()
        if(!authUser || get().socket?.connected) return
        const socket=io(BASE_URL,{
            query:{userId:authUser._id}
        })
        socket.connect()
        set({socket:socket})
        socket.on("getOnlineUsers",(userIds)=>{
            set({onlineUsers:userIds})
        })
    },
    disconnectSocket:()=>{
        if(get().socket?.connected) get().socket.disconnect()
    }
}))