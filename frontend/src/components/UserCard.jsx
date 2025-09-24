import { Link, useNavigate } from "react-router-dom";
import { MessageCircle } from 'lucide-react'
import axiosInstance from "../lib/axios";

function UserCard({ user, isConnection }) {
	const navigate = useNavigate();
	const startMessage = async ()=>{
		try {
			const res = await axiosInstance.post(`/messages/conversations/with/${user._id}`)
			navigate('/messages', { state: { openConvoId: res.data._id, newConvo: res.data } })
		} catch (e) {}
	}
	return (
		<div className='bg-base-100 rounded-lg shadow p-4 flex flex-col items-center transition-all hover:shadow-md'>
			<Link to={`/profile/${user.username}`} className='flex flex-col items-center'>
				<img
					src={user.profilePicture || "/avatar.png"}
					alt={user.name}
					className='w-24 h-24 rounded-full object-cover mb-4'
					loading='lazy'
					decoding='async'
					width={96}
					height={96}
				/>
				<h3 className='font-semibold text-lg text-center'>{user.name}</h3>
			</Link>
			<p className='text-gray-600 text-center'>{user.headline}</p>
			<p className='text-sm text-gray-500 mt-2'>{user.connections?.length} connections</p>
			<div className='mt-4 grid grid-cols-2 gap-2 w-full'>
				<button className='bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors'>
					{isConnection ? "Connected" : "Connect"}
				</button>
				<button className='btn btn-circle btn-ghost' title='Message' aria-label='Message' onClick={startMessage}><MessageCircle size={16}/></button>
			</div>
		</div>
	);
}

export default UserCard;
