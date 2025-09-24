import Navbar from "./Navbar";
import ThemeToggle from "../ThemeToggle";
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { connectSocket } from '../../lib/socket'
import { useLocation, useSearchParams } from 'react-router-dom'

const Layout = ({ children }) => {
	const qc = useQueryClient()
  const location = useLocation()
  const [params] = useSearchParams()
  const isMessages = location.pathname.startsWith('/messages')
  const chatOpen = Boolean(params.get('chat'))
	useEffect(()=>{
		const s = connectSocket()
		s.on('messages:unreadIncrement', ()=>{
			qc.invalidateQueries({ queryKey: ['unreadMsgCount'] })
		})
		s.on('message:new', ({ conversationId })=>{
			qc.invalidateQueries({ queryKey: ['conversations'] })
			qc.invalidateQueries({ queryKey: ['messages', conversationId] })
		})
		return ()=>{
			s.off('messages:unreadIncrement')
			s.off('message:new')
		}
	}, [qc])
	return (
		<div className='min-h-screen bg-base-100 text-base-content'>
			{/* Hide navbar on mobile when chat is open (full-screen chat) */}
			<div className={`${isMessages && chatOpen ? 'hidden md:block' : 'block'}`}>
				<Navbar />
			</div>
			{/* Remove page padding and max-width on mobile full-screen chat */}
			<main className={`${isMessages && chatOpen ? 'w-full mx-auto p-0 md:max-w-7xl md:px-4 md:py-6' : 'max-w-7xl mx-auto px-4 py-6'}`}>{children}</main>
			{!(isMessages && chatOpen) && <ThemeToggle />}
		</div>
	);
};
export default Layout;
