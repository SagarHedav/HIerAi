import {useMutation,useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../../lib/axios";
import { Link, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { Bell, Handshake, Home, LogOut, User, Users, Search, MessageCircle, Menu } from "lucide-react";
import React from "react";
// import {bgColor} from "../../App.css"
const Navbar = () => {
  const { data: authUser } = useQuery({ 
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
    const queryClient = useQueryClient();
  
    const { data: notifications } = useQuery({
      queryKey: ["notification"],
      queryFn: async () => axiosInstance.get("/notifications"),
      enabled: !!authUser,
    });
    const { data: connectionRequests } = useQuery({
        queryKey: ["connectionRequests"],
        queryFn: async () => axiosInstance.get("/connections/requests"),
        enabled: !!authUser,
      });
      const { data: unreadMsgCount } = useQuery({
        queryKey: ['unreadMsgCount'],
        queryFn: async ()=>{
          const res = await axiosInstance.get('/messages/unread-count')
          return res.data
        },
        enabled: !!authUser,
        refetchInterval: 10000,
      })
      const { mutate: logout } = useMutation({
          mutationFn: () => axiosInstance.post("/auth/logout"),
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["authUser"] });
          },
        });
    // console.log("connectionRequests",connectionRequests);
    // console.log("notifications",notifications);

  const unreadNotificationCount = notifications?.data.filter((notif) => !notif.read).length;
	const unreadConnectionRequestsCount = connectionRequests?.data?.length;

  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const isMessages = location.pathname.startsWith('/messages');
  const isHome = location.pathname === '/';
  const chatOpen = Boolean(params.get('chat'));
  const [searchUsername, setSearchUsername] = React.useState("");
  const [openDrop, setOpenDrop] = React.useState(false);
  const desktopDropRef = React.useRef(null)
  const mobileDropRef = React.useRef(null)
  // mobile hamburger menu state (home page only)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const mobileMenuRef = React.useRef(null)

  React.useEffect(()=>{
    const onDocClick = (e)=>{
      const d = desktopDropRef.current
      const m = mobileDropRef.current
      const mm = mobileMenuRef.current
      if (openDrop && d && !d.contains(e.target) && m && !m.contains(e.target)) {
        setOpenDrop(false)
      } else if (openDrop && d && !d.contains(e.target) && !m) {
        // desktop only present
        setOpenDrop(false)
      } else if (openDrop && m && !m.contains(e.target) && !d) {
        // mobile only present
        setOpenDrop(false)
      }
      if (mobileMenuOpen && mm && !mm.contains(e.target)) {
        setMobileMenuOpen(false)
      }
    }
    const onKey = (e)=>{ if (e.key === 'Escape') { setOpenDrop(false); setMobileMenuOpen(false) } }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return ()=>{
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [openDrop, mobileMenuOpen])

  const enabled = searchUsername.trim().length >= 2
  const { data: foundUsers, isLoading: isSearching } = useQuery({
    queryKey: ['userSearch', searchUsername],
    queryFn: async ()=>{
      const res = await axiosInstance.get('/users/search', { params: { q: searchUsername.trim() } })
      return res.data
    },
    enabled,
  })

  const onSearchSubmit = (e) => {
    e.preventDefault();
    if (!enabled) return;
    setOpenDrop(true);
  };

  return <>
    <nav className='bg-base-300 shadow-md sticky top-0 z-30'>
          <div className='max-w-7xl mx-auto px-4'>
            <div className='relative flex justify-between items-center py-3'>
                <div className='flex items-center space-x-4'>
                  <Link to='/'>
                    <img className='h-10 rounded' src='/logo.png' alt='hierAi' loading='lazy' />
                  </Link>
                </div>

                {/* Centered desktop search (non-overlapping) */}
                {authUser && (
                  <div className={`flex-1 ${isMessages && chatOpen ? 'hidden md:flex' : 'hidden md:flex'} justify-center`}>
                    <div className='w-[14rem] z-20' ref={desktopDropRef}>
                      <div className={`dropdown w-full ${openDrop ? 'dropdown-open' : ''}`}>
                        <form onSubmit={onSearchSubmit} className='flex items-center w-full' onFocus={()=>setOpenDrop(true)}>
                          <label className='input input-bordered input-sm flex items-center gap-2 w-full'>
                            <Search size={16} />
                            <input
                              type='text'
                              className='grow'
                              placeholder='Search name or username...'
                              value={searchUsername}
                              onChange={(e)=>{ setSearchUsername(e.target.value); setOpenDrop(true); }}
                            />
                          </label>
                        </form>
                        <ul tabIndex={0} className='dropdown-content menu p-2 shadow bg-base-200 rounded-box w-[14rem] max-h-72 overflow-auto mt-1'>
                          {(!enabled) && <li className='px-2 py-1 text-sm text-info'>Type at least 2 characters</li>}
                          {enabled && isSearching && <li className='px-2 py-1 text-sm'>Searching...</li>}
                          {enabled && !isSearching && Array.isArray(foundUsers) && foundUsers.length === 0 && (
                            <li className='px-2 py-1 text-sm text-info'>No matches</li>
                          )}
                          {enabled && Array.isArray(foundUsers) && foundUsers.map(u => (
                            <li key={u.username}>
                              <a onClick={()=>{ navigate(`/profile/${u.username}`); setOpenDrop(false); setSearchUsername(''); }} className='flex items-center gap-2'>
                                <img src={u.profilePicture || '/avatar.png'} className='w-6 h-6 rounded-full object-cover' />
                                <span className='font-medium'>{u.name}</span>
                                <span className='text-xs text-info'>@{u.username}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className='flex items-center gap-2 md:gap-6'>
                  {authUser ? (
                                <>
                                  {/* Always visible: Home */}
                                  <Link to={"/"} className='text-base-content flex flex-col items-center'>
                                    <Home size={20} />
                                    <span className='text-xs hidden md:block'>Home</span>
                                  </Link>

                                  {/* Jobs: collapsed on mobile for all pages */}
                                  <Link to='/jobs' className={`text-base-content flex flex-col items-center hidden md:flex`}>
                                    <Handshake size={20} />
                                    <span className='text-xs hidden md:block'>Jobs</span>
                                  </Link>

                                  {/* My Network: collapsed on mobile for all pages */}
                                  <Link to='/network' className={`text-base-content flex flex-col items-center relative hidden md:flex`}>
                                    <Users size={20} />
                                    <span className='text-xs hidden md:block'>My Network</span>
                                    {unreadConnectionRequestsCount > 0 && (
                                      <span
                                        className='absolute -top-1 -right-1 md:right-4 bg-blue-500 text-white text-xs 
                                      rounded-full size-3 md:size-4 flex items-center justify-center'
                                      >
                                        {unreadConnectionRequestsCount}
                                      </span>
                                    )}
                                  </Link>

                                  {/* Always visible: Notifications */}
                                  <Link to='/notifications' className='text-base-content flex flex-col items-center relative'>
                                    <Bell size={20} />
                                    <span className='text-xs hidden md:block'>Notifications</span>
                                  </Link>

                                  {/* Always visible: Messages */}
                                  <Link to='/messages' className='text-base-content flex flex-col items-center relative'>
                                    <MessageCircle size={20} />
                                    <span className='text-xs hidden md:block'>Messages</span>
                                    {unreadMsgCount?.count > 0 && (
                                      <span className='absolute -top-1 -right-1 md:right-4 bg-blue-500 text-white text-xs rounded-full size-3 md:size-4 flex items-center justify-center'>
                                        {unreadMsgCount.count}
                                      </span>
                                    )}
                                  </Link>

                                  {/* Me (kept visible) */}
                                  <Link
                                    to={`/profile/${authUser.username}`}
                                    className='text-base-content flex flex-col items-center'
                                  >
                                    <User size={20} />
                                    <span className='text-xs hidden md:block'>Me</span>
                                  </Link>

                                  {/* Logout: collapsed on mobile for all pages */}
                                  <button
                                    className={`flex items-center space-x-1 text-sm btn btn-soft hidden md:inline-flex`}
                                    onClick={() => logout()}
                                  >
                                    <LogOut size={20} />
                                    <span className='hidden md:inline'>Logout</span>
                                  </button>

                                  {/* Mobile hamburger for Jobs/Network/Logout on all pages (mobile only) */}
                                  {authUser && (
                                    <div className='md:hidden' ref={mobileMenuRef}>
                                      <div className={`dropdown dropdown-end ${mobileMenuOpen ? 'dropdown-open' : ''}`}>
                                        <button className='btn btn-ghost btn-circle' onClick={()=>setMobileMenuOpen(o=>!o)} aria-label='Open menu'>
                                          <Menu size={20} />
                                        </button>
                                        <ul tabIndex={0} className='dropdown-content menu p-2 shadow bg-base-200 rounded-box w-44 mt-2'>
                                          <li>
                                            <Link to='/jobs' onClick={()=>setMobileMenuOpen(false)} className='flex items-center gap-2'>
                                              <Handshake size={16} />
                                              <span>Jobs</span>
                                            </Link>
                                          </li>
                                          <li>
                                            <Link to='/network' onClick={()=>setMobileMenuOpen(false)} className='flex items-center gap-2'>
                                              <Users size={16} />
                                              <span>My Network</span>
                                            </Link>
                                          </li>
                                          <li>
                                            <button onClick={()=>{ setMobileMenuOpen(false); logout(); }} className='flex items-center gap-2'>
                                              <LogOut size={16} />
                                              <span>Logout</span>
                                            </button>
                                          </li>
                                        </ul>
                                      </div>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  <Link to='/login' className='btn btn-soft'>
                                    Sign In
                                  </Link>
                                  <Link to='/signup' className='btn btn-soft'>
                                    Join now
                                  </Link>
                                </>
                    )}
                </div>
            </div>
          </div>
        </nav>

        {/* Mobile floating search button */}
        {authUser && !(isMessages && chatOpen) && (
          <div className='fixed left-4 bottom-4 z-20 md:hidden'>
            <div ref={mobileDropRef} className={`dropdown dropdown-top ${openDrop ? 'dropdown-open' : ''}`}>
              <button className='btn btn-circle bg-black/40 text-white border border-white/10 hover:bg-black/50 backdrop-blur-sm' onClick={()=>setOpenDrop(o=>!o)}>
                <Search size={18} />
              </button>
              <ul tabIndex={0} className='dropdown-content menu p-2 shadow bg-base-200 rounded-box w-72 mb-2'>
                <form onSubmit={onSearchSubmit} className='mb-2' onFocus={()=>setOpenDrop(true)}>
                  <input
                    type='text'
                    className='input input-bordered input-sm w-full bg-black/30 text-white placeholder:text-white/70 border-white/20 backdrop-blur-sm focus:border-white/40'
                    placeholder='Search name or username...'
                    value={searchUsername}
                    onChange={(e)=>{ setSearchUsername(e.target.value); setOpenDrop(true); }}
                  />
                </form>
                {(!enabled) && <li className='px-2 py-1 text-sm text-info'>Type at least 2 characters</li>}
                {enabled && isSearching && <li className='px-2 py-1 text-sm'>Searching...</li>}
                {enabled && !isSearching && Array.isArray(foundUsers) && foundUsers.length === 0 && (
                  <li className='px-2 py-1 text-sm text-info'>No matches</li>
                )}
                {enabled && Array.isArray(foundUsers) && foundUsers.map(u => (
                  <li key={u.username}>
                    <a onClick={()=>{ navigate(`/profile/${u.username}`); setOpenDrop(false); setSearchUsername(''); }} className='flex items-center gap-2'>
                      <img src={u.profilePicture || '/avatar.png'} className='w-6 h-6 rounded-full object-cover' />
                      <span className='font-medium'>{u.name}</span>
                      <span className='text-xs text-info'>@{u.username}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
  </>
}

export default Navbar
