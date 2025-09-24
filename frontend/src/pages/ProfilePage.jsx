import React from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";

import ProfileHeader from "../components/ProfileHeader.jsx";
import AboutSection from "../components/AboutSection.jsx";
import ExperienceSection from "../components/ExperienceSection.jsx";
import EducationSection from "../components/EducationSection.jsx";
import SkillsSection from "../components/SkillsSection.jsx";
import Post from "../components/Post.jsx";
import PostCreation from "../components/PostCreation.jsx";
import toast from "react-hot-toast";

const ProfilePage = () => {
	const { username } = useParams();
	const queryClient = useQueryClient();

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
		    throw err;
		  }
		},
	});

	const { data: userProfile, isLoading: isUserProfileLoading } = useQuery({
		queryKey: ["userProfile", username],
		queryFn: () => axiosInstance.get(`/users/${username}`),
	});

  const { data: userPosts, isLoading: isUserPostsLoading } = useQuery({
    queryKey: ["postsByUser", username],
    queryFn: async () => {
      const res = await axiosInstance.get(`/posts/user/${username}`)
      return res.data
    }
  })

  // For own profile, fetch full connection objects (IDs returned by /auth/me)
  const { data: myConnections } = useQuery({
    queryKey: ["myConnections"],
    queryFn: async () => {
      const res = await axiosInstance.get('/connections')
      return res.data
    },
    enabled: !!authUser && authUser.username === username,
  })

  const [page, setPage] = React.useState(1)
  const pageSize = 10
  const total = Array.isArray(userPosts) ? userPosts.length : 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageStart = (page - 1) * pageSize
  const pagedPosts = Array.isArray(userPosts) ? userPosts.slice(pageStart, pageStart + pageSize) : []

	const { mutate: updateProfile } = useMutation({
		mutationFn: async (updatedData) => {
			await axiosInstance.put("/users/profile", updatedData);
		},
		onSuccess: () => {
			toast.success("Profile updated successfully");
			queryClient.invalidateQueries(["userProfile", username]);
		},
	});

	if (isLoading || isUserProfileLoading || isUserPostsLoading) return null;

	const isOwnProfile = authUser.username === userProfile.data.username;
	const userData = isOwnProfile ? authUser : userProfile.data;

  const connectionsForDisplay = isOwnProfile ? (myConnections || []) : (userData?.connections || [])

	const handleSave = (updatedData) => {
		updateProfile(updatedData);
	};

	return (
		<div className='max-w-4xl mx-auto p-4'>
			<ProfileHeader userData={userData} isOwnProfile={isOwnProfile} onSave={handleSave} />
      <div className='mt-2 mb-1 text-sm text-info'>Connections: {Array.isArray(connectionsForDisplay) ? connectionsForDisplay.length : 0}</div>
      {Array.isArray(connectionsForDisplay) && connectionsForDisplay.length > 0 && (
        <div className='flex gap-2 mt-2 mb-4'>
          {connectionsForDisplay.slice(0,6).map((c, idx)=>(
            c?.username ? (
              <Link key={c._id || idx} to={`/profile/${c.username}`} title={c.name} className='inline-block'>
              <img src={c.profilePicture || '/avatar.png'} loading='lazy' className='w-10 h-10 rounded-full object-cover border-2 border-base-300' />
              </Link>
            ) : (
              <img key={c._id || idx} src={c.profilePicture || '/avatar.png'} loading='lazy' className='w-10 h-10 rounded-full object-cover border-2 border-base-300' />
            )
          ))}
          {connectionsForDisplay.length > 6 && (
            <span className='text-xs text-info ml-2'>+{connectionsForDisplay.length - 6} more</span>
          )}
        </div>
      )}
			<AboutSection userData={userData} isOwnProfile={isOwnProfile} onSave={handleSave} />
			<ExperienceSection userData={userData} isOwnProfile={isOwnProfile} onSave={handleSave} />
			<EducationSection userData={userData} isOwnProfile={isOwnProfile} onSave={handleSave} />
			<SkillsSection userData={userData} isOwnProfile={isOwnProfile} onSave={handleSave} />

      <div className='mt-6'>
        <h2 className='text-xl font-semibold mb-3'>Posts</h2>
        {isOwnProfile && (
          <PostCreation user={userData} invalidateKeys={[["postsByUser", username]]} />
        )}
        {Array.isArray(pagedPosts) && pagedPosts.length ? (
          <>
            {pagedPosts.map(p => (
              <Post key={p._id} post={p} invalidateKeys={[["postsByUser", username]]} />
            ))}
            {totalPages > 1 && (
              <div className='flex justify-between items-center mt-3'>
                <button className='btn btn-sm' disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</button>
                <div className='text-sm'>Page {page} / {totalPages}</div>
                <button className='btn btn-sm' disabled={page===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</button>
              </div>
            )}
          </>
        ) : (
          <div className='text-info'>No posts yet.</div>
        )}
      </div>
		</div>
	);
};
export default ProfilePage;
