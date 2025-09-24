import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { axiosInstance } from "../../lib/axios";
import toast from "react-hot-toast";
import { Loader } from "lucide-react";

const LoginForm = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("student");
    const queryClient = useQueryClient();
    const [oauthGoogle, setOauthGoogle] = useState(false)

    useEffect(() => {
        let mounted = true
        axiosInstance.get('/auth/providers').then(res => {
            if (mounted) setOauthGoogle(!!res.data?.google)
        }).catch(() => { /* ignore */ })
        return () => { mounted = false }
    }, [])

    const { mutate: loginMutation, isLoading } = useMutation({
        mutationFn: (userData) => axiosInstance.post("/auth/login", userData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["authUser"] });
        },
        onError: (err) => {
            toast.error(err.response.data.message || "Something went wrong");
        },
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        loginMutation({ username, password , role})
    };   

    return (
        <form onSubmit={handleSubmit} className='space-y-4 w-full max-w-md'>
            <input
                type='text'
                placeholder='Username'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className='input input-bordered w-full'
                required
            />
            <input
                type='password'
                placeholder='Password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className='input input-bordered w-full'
                required
            />
            <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className='select select-bordered w-full'
                required
              >
                <option value='' disabled>Select role</option>
                <option value='student'>student</option>
                <option value='recruiter'>recruiter</option>
              </select>

            <button type='submit' className='btn btn-primary w-full'>
                {isLoading ? <Loader className='size-5 animate-spin' /> : "Login"}
            </button>
            <div className='divider'>or</div>
            <div className='flex flex-col gap-2'>
              <button type='button' className='btn btn-soft w-full' disabled={!oauthGoogle}
                onClick={() => {
                  if (!oauthGoogle) return
                  const r = role || 'student'
                  const ORIGIN = import.meta.env.MODE === 'development' ? 'http://localhost:3001' : ''
                  window.location.href = `${ORIGIN}/api/v1/auth/google?role=${encodeURIComponent(r)}`
                }}
              >Continue with Google</button>
            </div>
        </form>
    );
};
export default LoginForm;
