import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axiosInstance from '../lib/axios'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Reply, Send, Smile, Plus, Image as ImageIcon, Video as VideoIcon, Paperclip, Camera } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { toast } from 'react-hot-toast'

// Messages page rewritten for stable layout, constant avatar spacing, and robust wrapping
export default function MessagesPage() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()

  // Data
  const { data: authUser } = useQuery({ queryKey: ['authUser'] })
  const { data: convos, refetch: refetchConvos } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await axiosInstance.get('/messages/conversations')
      return res.data
    }
  })

  // Active conversation selection
  const [active, setActive] = useState(null)
  useEffect(() => {
    const urlId = searchParams.get('chat')
    const openId = location.state?.openConvoId || urlId
    if (!openId) { setActive(null); return }
    if (Array.isArray(convos)) {
      const found = convos.find(c => c._id === openId)
      if (found) { setActive(found); return }
    }
    if (location.state?.newConvo) { setActive(location.state.newConvo); return }
    refetchConvos()
  }, [location.state, convos, refetchConvos, searchParams])

  const { data: messages } = useQuery({
    queryKey: ['messages', active?._id],
    queryFn: async () => {
      const res = await axiosInstance.get(`/messages/conversations/${active._id}/messages`)
      return res.data
    },
    enabled: !!active
  })

  // Compose state
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [showTimeFor, setShowTimeFor] = useState(null)
  const [reactFor, setReactFor] = useState(null)

  // Attachment UI state
  const [plusOpen, setPlusOpen] = useState(false)
  const plusRef = useRef(null)
  const [assistOpen, setAssistOpen] = useState(false)
  const imgInputRef = useRef(null)
  const vidInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const camPhotoInputRef = useRef(null)
  const camVideoInputRef = useRef(null)

  // Touch helpers
  const longPressTimer = useRef(null)
  const touchInfo = useRef(null)

  // Send message
  const { mutate: sendMsg, isLoading } = useMutation({
    mutationFn: async (overridePayload) => {
      const payload = overridePayload ?? { content: text }
      if (replyTo?._id && !payload?.replyTo) payload.replyTo = replyTo._id
      const res = await axiosInstance.post(`/messages/conversations/${active._id}/messages`, payload)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', active?._id] })
      setReplyTo(null)
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Failed to send message'
      toast.error(msg)
    }
  })
  const onSend = (e) => {
    e.preventDefault()
    if ((!text || !text.trim()) && !active) return
    sendMsg(undefined, { onSuccess: () => setText('') })
  }

  // Mark conversation as read when opened
  useEffect(() => {
    if (!active?._id) return
    axiosInstance.put(`/messages/conversations/${active._id}/read`).then(() => {
      qc.invalidateQueries({ queryKey: ['unreadMsgCount'] })
    }).catch(() => {})
  }, [active?._id])

  const hasActive = !!active
  const onBack = () => { setActive(null); setSearchParams({}) }

  // Close plus menu on outside click / Escape
  useEffect(() => {
    const onDoc = (e) => { if (plusOpen && plusRef.current && !plusRef.current.contains(e.target)) setPlusOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setPlusOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [plusOpen])

  const readAsDataURL = (file) => new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = reject
    fr.readAsDataURL(file)
  })

  const MAX_IMAGE_MB = 10
  const MAX_VIDEO_MB = 25
  const MAX_FILE_MB = 15

  const onPick = async (file) => {
    if (!file || !active) return
    try {
      const isImg = file.type.startsWith('image/')
      const isVid = file.type.startsWith('video/')
      const max = isImg ? MAX_IMAGE_MB : isVid ? MAX_VIDEO_MB : MAX_FILE_MB
      if (file.size > max * 1024 * 1024) {
        toast.error(`${isVid ? 'Video' : isImg ? 'Image' : 'File'} exceeds ${max} MB limit`)
        return
      }
      const data = await readAsDataURL(file)
      const payload = {
        content: text?.trim() || '',
        attachment: { data, name: file.name, type: file.type, size: file.size }
      }
      sendMsg(payload, { onSuccess: () => { setText(''); setPlusOpen(false) } })
    } catch (e) {
      toast.error('Failed to prepare attachment')
    }
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 ${hasActive ? 'gap-0 md:gap-4' : 'gap-4'}`}>
      {/* Conversations list */}
      <aside className={`${hasActive ? 'hidden md:block' : 'block'} bg-base-300/30 backdrop-blur-md rounded-xl p-2 border border-white/10`}>
        <div className='flex items-center gap-2 mb-2 px-2 pt-1'>
          <MessageSquare size={18} />
          <h3 className='font-semibold'>Conversations</h3>
        </div>
        <div className='divide-y divide-base-200/30 max-h-[70vh] overflow-auto rounded-lg'>
          {(convos || []).map(c => {
            const other = c.participants.find(p => p._id !== authUser?._id) || c.participants[0]
            return (
              <button key={c._id} className={`w-full text-left px-3 py-2 hover:bg-base-200/30 ${active?._id === c._id ? 'bg-base-200/30' : ''}`}
                      onClick={() => { setActive(c); setSearchParams({ chat: c._id }) }}>
                <div className='flex items-center gap-3'>
                  <img src={other?.profilePicture || '/avatar.png'} className='w-8 h-8 rounded-full' />
                  <div>
                    <div className='font-medium'>{other?.name}</div>
                    <div className='text-xs text-info line-clamp-1'>{c.lastMessage}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Chat pane */}
      <section className={`${hasActive ? 'block' : 'hidden md:block'} md:col-span-2 bg-base-300 ${hasActive ? 'rounded-none p-0 fixed inset-0 z-20 md:relative md:p-3 md:rounded' : 'rounded p-3'} flex flex-col h-screen md:h-[70vh]`}>
        {!active ? (
          <div className='m-auto text-info'>Select a conversation</div>
        ) : (
          <>
            {/* Mobile header */}
            <div className='md:hidden flex items-center gap-2 mb-2 px-3 pt-3'>
              <button className='btn btn-ghost btn-sm' onClick={onBack}><ArrowLeft size={18} /></button>
              <div className='font-semibold'>
                {(active.participants || []).find(p => p._id !== authUser?._id)?.name || 'Chat'}
              </div>
            </div>

            {/* Messages */}
            <div className='flex-1 overflow-auto space-y-2 pr-1 px-3'>
              {(messages || []).map((m, idx) => {
                const mine = m.sender?._id === authUser?._id

                // Centered timestamp between clusters
                const curr = m?.createdAt ? new Date(m.createdAt) : null
                const prev = (idx > 0 && (messages || [])[idx - 1]?.createdAt) ? new Date((messages || [])[idx - 1].createdAt) : null
                const showCenter = curr && (!prev || !isSameDay(curr, prev) || (curr - prev) > 15 * 60 * 1000)

                // Touch gestures
                const onTouchStart = (e) => {
                  const x = e.touches?.[0]?.clientX || 0
                  touchInfo.current = { startX: x, mine, msg: m, acted: false }
                  if (longPressTimer.current) clearTimeout(longPressTimer.current)
                  longPressTimer.current = setTimeout(() => { setReactFor(m._id); touchInfo.current.acted = true }, 500)
                }
                const onTouchMove = (e) => {
                  const x = e.touches?.[0]?.clientX || 0
                  if (!touchInfo.current) return
                  const dx = x - touchInfo.current.startX
                  if (Math.abs(dx) > 6 && longPressTimer.current) { clearTimeout(longPressTimer.current) }
                  const threshold = 60
                  if (!touchInfo.current.acted) {
                    if (touchInfo.current.mine && dx < -threshold) { setReplyTo(m); touchInfo.current.acted = true }
                    if (!touchInfo.current.mine && dx > threshold) { setReplyTo(m); touchInfo.current.acted = true }
                  }
                }
                const onTouchEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }

                const onReact = async (type) => {
                  try {
                    try { await axiosInstance.post(`/messages/messages/${m._id}/react`, { type }) }
                    catch { await axiosInstance.post(`/messages/conversations/${active._id}/messages/${m._id}/react`, { type }) }
                    qc.invalidateQueries({ queryKey: ['messages', active?._id] })
                  } catch {}
                  setReactFor(null)
                }

                return (
                  <div key={m._id}>
                    {showCenter && (
                      <div className='w-full flex justify-center my-2'>
                        <span className='text-xs text-base-content/60 bg-base-200/40 px-2 py-0.5 rounded-full'>
                          {curr ? format(curr, 'HH:mm') : ''}
                        </span>
                      </div>
                    )}

                    {/* Row – custom component (no DaisyUI chat) */}
                    <div className={`msg-row ${mine ? 'me' : ''} group gap-3 md:gap-4`}
                         onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
                      <img className='msg-avatar' src={m.sender?.profilePicture || '/avatar.png'} />

                      {/* Bubble and actions */}
                      <div className={`w-full flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className='relative inline-flex flex-col w-fit max-w-[70%]'>
                          {(m.replyTo || (m.content && m.content.trim().length > 0)) && (
                            <div className={`msg-bubble max-w-full min-w-[8rem] leading-relaxed text-sm shadow ${mine ? 'bg-primary text-primary-content' : 'bg-base-200/80 text-base-content'} rounded-2xl text-left px-4 py-2 sm:py-3`}
                                 role='button' tabIndex={0}
                                 onClick={() => setShowTimeFor(prev => prev === m._id ? null : m._id)}
                                 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowTimeFor(prev => prev === m._id ? null : m._id) }}
                                 aria-label='Toggle timestamp'>
                              {m.replyTo && (
                                <div className={`reply-box text-xs ${mine ? 'text-primary-content/80' : 'text-base-content/80'} bg-base-100/40 border border-base-200/60 rounded-md p-2 mb-2 text-left`}>
                                  <div className='line-clamp-3 whitespace-pre-wrap break-words msg-anywhere'>{m.replyTo?.content}</div>
                                </div>
                              )}
                              <div className='text-left whitespace-pre-wrap break-words msg-anywhere'>{m.content}</div>
                            </div>
                          )}
                          {m.attachment?.url && (
                            <div className='mt-2'>
                              {(/^image\//.test(m.attachment.type)) ? (
                                <img src={m.attachment.url} alt={m.attachment.name || 'image'} className='max-w-xs rounded-lg' loading='lazy'/>
                              ) : (/^video\//.test(m.attachment.type)) ? (
                                <video controls src={m.attachment.url} className='max-w-xs rounded-lg'/>
                              ) : (
                                <a className='link' href={m.attachment.url} target='_blank' rel='noreferrer'>
                                  {m.attachment.name || 'Download file'}
                                </a>
                              )}
                            </div>
                          )}

                          {/* Hover actions (desktop only) */}
                          <div className={`absolute top-1/2 -translate-y-1/2 ${mine ? 'right-full mr-2' : 'left-full ml-2'} hidden sm:flex gap-1 opacity-0 group-hover:opacity-100 transition z-20 pointer-events-none group-hover:pointer-events-auto`}>
                            <button className='btn btn-ghost btn-xs rounded-full' title='Reply' onClick={() => setReplyTo(m)}>
                              <Reply size={14} />
                            </button>
                            <button className='btn btn-ghost btn-xs rounded-full' title='React' onClick={() => setReactFor(m._id)}>
                              <Smile size={14} />
                            </button>
                          </div>

                          {reactFor === m._id && (
                            <div className={`absolute top-1/2 -translate-y-1/2 ${mine ? 'right-full mr-2' : 'left-full ml-2'} bg-base-200 rounded-full shadow px-2 py-1 flex gap-2 z-30`}
                                 role='menu' aria-label='Pick a reaction'>
                              {['👍', '❤️', '👏', '😂', '😮'].map(em => (
                                <button key={em} className='text-lg hover:scale-110 transition' onClick={() => onReact(em)}>{em}</button>
                              ))}
                            </div>
                          )}

                          {/* Reactions pill */}
                          {Array.isArray(m.reactions) && m.reactions.length > 0 && (() => {
                            const counts = (m.reactions || []).reduce((acc, r) => { const t = r.type || ''; acc[t] = (acc[t] || 0) + 1; return acc }, {})
                            const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 3)
                            return (
                              <div className={`absolute -bottom-4 ${mine ? 'right-4' : 'left-4'} bg-black/70 text-white rounded-full px-2 py-1 flex items-center gap-1 text-sm shadow`} role='button' aria-label='Message reactions'>
                                {top.map(t => (<span key={t} className='leading-none'>{t}</span>))}
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Composer */}
            <div className='px-3 pt-2'>
              <form onSubmit={onSend} className='flex items-center gap-2'>
                <div className='relative flex-grow' ref={plusRef}>
                  <button type='button' className='btn btn-ghost btn-sm absolute left-0 top-1/2 -translate-y-1/2' onClick={()=>setPlusOpen(o=>!o)} aria-label='Add attachment'>
                    <Plus size={18} />
                  </button>
                  <input
                    type='text'
                    value={text}
                    onChange={(e) => { const v=e.target.value; setText(v); setAssistOpen(/@hierAi\s*$/i.test(v)); }}
                    placeholder='Message...'
                    className='w-full p-2 pl-8 rounded-full bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary'
                  />
                  {assistOpen && (
                    <ul className='absolute bottom-12 left-12 menu p-2 shadow bg-base-200 rounded-box w-56 z-30'>
                      <li><button type='button' onClick={async ()=>{ try { const other = (active?.participants||[]).find(p=>p._id!==authUser?._id); const res = await axiosInstance.post(`/users/intro-suggest/${other?._id}`); setText(text.replace(/@hierAi\s*$/i, res.data?.intro || '')); setAssistOpen(false); } catch { toast.error('Failed to generate intro') } }}>Insert self intro</button></li>
                      <li><button type='button' onClick={async ()=>{ try { const res = await axiosInstance.post('/messages/ai/assist', { mode:'fix', text }); setText(res.data?.text || text); setAssistOpen(false); } catch { toast.error('Failed to fix grammar') } }}>Fix grammar</button></li>
                    </ul>
                  )}
                  {plusOpen && (
                    <ul className='absolute bottom-12 left-0 menu p-2 shadow bg-base-200 rounded-box w-48 z-30'>
                      <li><button type='button' onClick={()=>imgInputRef.current?.click()} className='flex items-center gap-2'><ImageIcon size={16}/> Photo</button></li>
                      <li><button type='button' onClick={()=>vidInputRef.current?.click()} className='flex items-center gap-2'><VideoIcon size={16}/> Video</button></li>
                      <li><button type='button' onClick={()=>fileInputRef.current?.click()} className='flex items-center gap-2'><Paperclip size={16}/> File</button></li>
                      <li><button type='button' onClick={()=>camPhotoInputRef.current?.click()} className='flex items-center gap-2'><Camera size={16}/> Camera photo</button></li>
                      <li><button type='button' onClick={()=>camVideoInputRef.current?.click()} className='flex items-center gap-2'><VideoIcon size={16}/> Camera video</button></li>
                    </ul>
                  )}
                  {/* hidden pickers */}
                  <input ref={imgInputRef} type='file' accept='image/*' className='hidden' onChange={(e)=>{ const f=e.target.files?.[0]; e.target.value=''; onPick(f) }} />
                  <input ref={vidInputRef} type='file' accept='video/*' className='hidden' onChange={(e)=>{ const f=e.target.files?.[0]; e.target.value=''; onPick(f) }} />
                  <input ref={fileInputRef} type='file' className='hidden' onChange={(e)=>{ const f=e.target.files?.[0]; e.target.value=''; onPick(f) }} />
                  <input ref={camPhotoInputRef} type='file' accept='image/*' capture='environment' className='hidden' onChange={(e)=>{ const f=e.target.files?.[0]; e.target.value=''; onPick(f) }} />
                  <input ref={camVideoInputRef} type='file' accept='video/*' capture='environment' className='hidden' onChange={(e)=>{ const f=e.target.files?.[0]; e.target.value=''; onPick(f) }} />
                </div>
                <button
                  type='submit'
                  className='bg-primary text-white p-2 rounded-full hover:bg-primary-dark transition duration-300'
                  disabled={isLoading}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>

            {/* Reply preview */}
            {replyTo && (
              <div className='px-3 pt-2'>
                <div className='bg-base-200/60 rounded-md px-3 py-2 text-xs flex items-start justify-between gap-3'>
                  <div>
                    <div className='line-clamp-2 whitespace-pre-wrap break-words text-info'>{replyTo.content}</div>
                  </div>
                  <button className='btn btn-ghost btn-xs' onClick={() => setReplyTo(null)} aria-label='Cancel reply'>✕</button>
                </div>
              </div>
            )}

          </>
        )}
      </section>
    </div>
  )
}
