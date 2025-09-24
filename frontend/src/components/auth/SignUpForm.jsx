import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../../lib/axios";
import { toast } from "react-hot-toast";
import { Loader } from "lucide-react";

const SignUpForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [phoneNumber, setPhoneNumber] = useState("");
  const queryClient = useQueryClient();
  const [oauth, setOauth] = useState({ google: false, twitter: false })

  useEffect(() => {
    let mounted = true
    axiosInstance.get('/auth/providers').then(res => {
      if (mounted) setOauth({
        google: !!res.data?.google,
        twitter: !!res.data?.twitter,
      })
    }).catch(() => { /* ignore */ })
    return () => { mounted = false }
  }, [])

  const { mutate: signUpMutation, isLoading } = useMutation({
    mutationFn: async (data) => {
      const res = await axiosInstance.post("/auth/signup", data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Account created successfully");
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (err) => {
      toast.error(err.response.data.message || "Something went wrong");
    },
  });

  const handleSignUp = (e) => {
    e.preventDefault();
    signUpMutation({ name, email, username, password , role, phoneNumber});
  };

  return (
    <form onSubmit={handleSignUp} className='flex flex-col gap-4 '>
      <input
        type='text'
        placeholder='Full name'
        value={name}
        onChange={(e) => setName(e.target.value)}
        className='input input-bordered w-full bg-base-100 text-gray-100'
        required
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className='select select-bordered w-full bg-base-100 text-gray-100'
        required
      >
        <option value='student'>Student</option>
        <option value='recruiter'>Recruiter</option>
      </select>
      <input
        type='text'
        placeholder='phone number'
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        className='input input-bordered w-full bg-base-100 text-gray-100'
        required
      />
      <input
        type='text'
        placeholder='Username'
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className='input input-bordered w-full bg-base-100 text-gray-100'
        required
      />
      <input
        type='email'
        placeholder='Email'
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className='input input-bordered w-full bg-base-100 text-gray-100'
        required
      />
      <input
        type='password'
        placeholder='Password (6+ characters)'
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className='input input-bordered w-full bg-base-100 text-gray-100'
        required
      />
      <button type='submit' disabled={isLoading} className='btn btn-primary w-full text-white'>
        {isLoading ? <Loader className='size-5 animate-spin' /> : "Agree & Join"}
      </button>
      <div className='divider'>or</div>
      <div className='flex flex-col gap-2'>
        <button type='button' className='btn btn-outline w-full' disabled={!oauth.google}
          onClick={() => {
            if (!oauth.google) return
            const r = role || 'student'
            const ORIGIN = import.meta.env.MODE === 'development' ? 'http://localhost:3001' : 'https://hierai.onrender.com'
            window.location.href = `${ORIGIN}/api/v1/auth/google?role=${encodeURIComponent(r)}`
          }}
        >Continue with Google</button>
        <button type='button' className='btn btn-outline w-full' disabled={!oauth.twitter}
          onClick={() => {
            if (!oauth.twitter) return
            const r = role || 'student'
            const ORIGIN = import.meta.env.MODE === 'development' ? 'http://localhost:3001' : 'https://hierai.onrender.com'
            window.location.href = `${ORIGIN}/api/v1/auth/twitter?role=${encodeURIComponent(r)}`
          }}
        >Continue with Twitter</button>
      </div>
    </form>
  );
};

export default SignUpForm;
