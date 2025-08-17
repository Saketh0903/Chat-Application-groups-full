import React, { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore';
import { Loader2, Lock, Mail, MessageSquare, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthImagePattern from '../components/AuthImagePattern.jsx';
import { toast, Toaster } from 'react-hot-toast';

function SignupPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [formData,setFormData]=useState({
      fullName:"",
      email:"",
      password:""
    })
    const {signup,isSigningUp}=useAuthStore()

    const validateForm=()=>{
      if(formData.fullName===""){
        return toast.error("Full Name is required")
      }
      if(formData.email===""){
        return toast.error("Email is required")
      }
      if(formData.password===""){
        return toast.error("Password is required")
      }
      // check for email validation
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if(!emailRegex.test(formData.email)){
        return toast.error("Invalid email format")
      }
      if(formData.password.length<6){
        return toast.error("Password must be at least 6 characters long")
      }
      return true
    }

    const handleSubmit=(e)=>{
      e.preventDefault()
      const success=validateForm()
      if(success===true){
        signup(formData)
      }
    }
  return (
    <div className='min-h-screen grid lg:grid-cols-2'>
      <div className='flex flex-col justify-center items-center p-6 sm:p-12'>
        <div className='w-full max-w-md space-y-8'>
          <div className='text-center mb-8'>
            <div className='flex flex-col items-center gap-2 group'>
              <div className='size-12 rounded-xl bg-primary/20 flex items-center justify-center'>
                 <MessageSquare className='size-6 text-primary' />
              </div>
              <h1 className='text-2xl font-bold mt-2'>Create Account</h1>
              <p className='text-base-content/60'>Get Started with your free account</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='form-control'>
              <label htmlFor="" className='label'>
                <span className='label-text font-medium'>Full Name</span>
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <User className='size-5 text-base-content/40' />
                </div>
                <input type="text" className={`input input-bordered w-full pl-10`} placeholder='John Doe' value={formData.fullName} onChange={(e)=>{setFormData({...formData,fullName:e.target.value})}} />
              </div>
            </div>
            <div className='form-control'>
              <label htmlFor="" className='label'>
                <span className='label-text font-medium'>Email</span>
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <Mail className='size-5 text-base-content/40' />
                </div>
                <input type="email" className={`input input-bordered w-full pl-10`} placeholder='you@example.com' value={formData.email} onChange={(e)=>{setFormData({...formData,email:e.target.value})}} />
              </div>
            </div>
            <div className='form-control'>
              <label htmlFor="" className='label'>
                <span className='label-text font-medium'>Password</span>
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <Lock className='size-5 text-base-content/40' />
                </div>{isSigningUp}
                <input type="password" className={`input input-bordered w-full pl-10`} placeholder='********' value={formData.password} onChange={(e)=>{setFormData({...formData,password:e.target.value})}} />
              </div>
            </div>
            <button type='submit' className='btn btn-primary w-full' disabled={isSigningUp}>
              {
                isSigningUp?(
                  <>
                    <Loader2 className='size-5 animate-spin' />
                    Loading...
                  </>
                ):
                (
                  "Create Account"
                )
              }
            </button>
          </form>
          <div className='text-center'>
            <p className='text-base-content/60'>Already have an account? {""}<Link to="/login" className='link link-primary'>Login</Link></p>
          </div>
        </div>
      </div>
      <AuthImagePattern title='Join our community' subtitle='Connect seamlessly with our platform' />
    </div>
  )
}

export default SignupPage
