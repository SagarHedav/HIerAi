import { Navigate} from "react-router-dom";
import { Toaster, toast } from 'react-hot-toast'
import Layout from './components/layouts/Layout.jsx'
import {Routes, Route } from 'react-router-dom'
import axiosInstance from './lib/axios'
import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'

const HomePage = lazy(() => import('./pages/HomePage.jsx'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'))
const SignUpPage = lazy(() => import('./pages/auth/SignUpPage.jsx'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage.jsx'))
const NetworkPage = lazy(() => import('./pages/NetworkPage.jsx'))
const PostPage = lazy(() => import('./pages/PostPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const Jobs = lazy(() => import('./pages/jobs.jsx'))
const JobDetail = lazy(() => import('./pages/JobDetail.jsx'))
const PostJob = lazy(() => import('./pages/PostJob.jsx'))
const RegisterCompany = lazy(() => import('./pages/RegisterCompany.jsx'))
const EditCompany = lazy(() => import('./pages/EditCompany.jsx'))
const Companies = lazy(() => import('./pages/Companies.jsx'))
const MessagesPage = lazy(()=> import('./pages/MessagesPage.jsx'))
function App() {
  const { data: authUser, isLoading } = useQuery({
      queryKey: ["authUser"],
      queryFn: async () => {
        try {
          const res = await axiosInstance.get("/auth/me");
          return res.data;
        } catch (err) {
          if (err.response && err.response.status === 401) {
            return null;
          }
          toast.error(err.response.data.message || "Something went wrong");
        }
      },
    });
    if (isLoading) return (
      <div className="flex justify-center items-center min-h-screen bg-base-100">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-4 text-base-content">Loading HIerAi...</p>
        </div>
      </div>
    );
    console.log(authUser);
  return <>
      <Layout>
        <Suspense fallback={<div className="p-6">Loading...</div>}>
          <Routes>
            <Route path='/' element={authUser ? <HomePage /> : <Navigate to={"/login"} />} />
            <Route path='/signup' element={!authUser ? <SignUpPage /> : <Navigate to={"/"} />} />
            <Route path='/login' element={!authUser ? <LoginPage /> : <Navigate to={"/"} />} />
            <Route path='/notifications' element={authUser ? <NotificationsPage /> : <Navigate to={"/login"} />} />
            <Route path='/network' element={authUser ? <NetworkPage /> : <Navigate to={"/login"} />} />
            <Route path='/messages' element={authUser ? <MessagesPage /> : <Navigate to={"/login"} />} />
            <Route path='/post/:postId' element={authUser ? <PostPage /> : <Navigate to={"/login"} />} />
            <Route path='/profile/:username' element={authUser ? <ProfilePage /> : <Navigate to={"/login"} />} />
            <Route
              path='/jobs'
              element={
                authUser
                  ? <Jobs />
                  : <Navigate to={"/login"} />
              }
            />
            <Route
              path='/jobs/:id'
              element={
                authUser
                  ? <JobDetail />
                  : <Navigate to={"/login"} />
              }
            />
            <Route
              path='/jobs/post'
              element={
                authUser && authUser.role === 'recruiter'
                  ? <PostJob />
                  : <Navigate to={'/'} />
              }
            />
            <Route
              path='/company/register'
              element={
                authUser && authUser.role === 'recruiter'
                  ? <RegisterCompany />
                  : <Navigate to={'/'} />
              }
            />
            <Route
              path='/company/edit/:id'
              element={
                authUser && authUser.role === 'recruiter'
                  ? <EditCompany />
                  : <Navigate to={'/'} />
              }
            />
            <Route
              path='/companies'
              element={
                authUser && authUser.role === 'recruiter'
                  ? <Companies />
                  : <Navigate to={'/'} />
              }
            />
          </Routes>
        </Suspense>
        <Toaster />
      </Layout>
  </>
}

export default App
