import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import PostCreation from "../components/PostCreation";
import Sidebar from "../components/Sidebar";
import Post from "../components/Post";
import { Users } from "lucide-react";
import RecommendedUser from "../components/RecommendedUser";
const HomePage = () => {
  const { data: authUser } = useQuery({ queryKey: ["authUser"] });
  
    const { data: recommendedUsers } = useQuery({
      queryKey: ["recommendedUsers"],
      queryFn: async () => {
        const res = await axiosInstance.get("/users/suggestions");
        return res.data;
      },
      staleTime: 1000 * 60 * 30,
    });
    console.log("recommendedUsers", recommendedUsers);
    const { data: posts } = useQuery({
      queryKey: ["posts"],
      queryFn: async () => {
        const res = await axiosInstance.get("/posts");
        return res.data;
      },
    });
    const { data: discover } = useQuery({
      queryKey: ["discoverPosts"],
      queryFn: async () => {
        const res = await axiosInstance.get("/posts/discover/me");
        return res.data;
      },
      staleTime: 1000*60*10,
    });
    console.log("posts", posts);
  return (
    <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
      <div className='hidden lg:block lg:col-span-1'>
        <Sidebar user={authUser} />
      </div>
      <div className='col-span-1 lg:col-span-2 order-first lg:order-none'>
        <PostCreation user={authUser} />

        {posts?.map((post, idx) => (
          <div key={post._id}>
            <Post post={post} />
            {/* After first post, show mobile-only suggestions carousel */}
            {idx === 0 && recommendedUsers?.length > 0 && (
              <div className='lg:hidden my-4'>
                <h3 className='font-semibold mb-2 px-1'>Suggested for you</h3>
                <div className='flex gap-3 overflow-x-auto px-1 pb-1'>
                  {recommendedUsers.map(u => (
                    <div key={u._id} className='shrink-0'>
                      <RecommendedUser user={u} compact />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {Array.isArray(discover) && discover.length > 0 && (
          <div className='mt-6'>
            <h3 className='font-semibold mb-2 px-1'>Recommended for you</h3>
            {discover.slice(0,3).map(p => (
              <Post key={p._id} post={p} />
            ))}
          </div>
        )}

        {posts?.length === 0 && (
            <div className='bg-base-300 rounded-lg shadow p-8 text-center'>
              <div className='mb-6'>
                <Users size={64} className='mx-auto text-blue-500' />
              </div>
              <h2 className='text-2xl font-bold mb-4 text-white'>No Posts Yet</h2>
              <p className='text-gray-600 mb-6'>Connect with others to start seeing posts in your feed!</p>
            </div>
          )}
      </div>
      {recommendedUsers?.length > 0 && (
				<div className='col-span-1 lg:col-span-1 hidden lg:block'>
					<div className='bg-base-300 rounded-lg shadow p-4'>
						<h2 className='font-semibold mb-4'>People you may know</h2>
						{recommendedUsers?.map((user) => (
							<RecommendedUser key={user._id} user={user} />
						))}
					</div>
				</div>
			)}
    </div>
  )
}

export default HomePage
