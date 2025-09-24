import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import { Loader, MessageCircle, Send, Share2, Heart, Trash2, Link as LinkIcon, Instagram, Twitter, Bookmark, ThumbsUp, Reply } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import PostAction from "./PostAction";

// Inline WhatsApp icon (brand logo)
const WhatsAppIcon = ({ size = 16, className = "" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        fill="currentColor"
        aria-hidden="true"
    >
        <path d="M20.52 3.48A11.77 11.77 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.12.56 4.11 1.62 5.91L0 24l6.27-1.64A11.93 11.93 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.2-3.48-8.52zM12 22a10 10 0 0 1-5.1-1.41l-.36-.21L3 21l.62-3.41-.22-.35A10 10 0 1 1 22 12 10 10 0 0 1 12 22zm5.21-7.79c-.29-.15-1.7-.84-1.97-.94-.26-.1-.45-.15-.64.15-.19.29-.74.94-.9 1.13-.17.19-.33.21-.62.08-.29-.15-1.21-.45-2.3-1.44-.85-.76-1.43-1.7-1.6-1.99-.17-.29-.02-.45.13-.59.13-.13.29-.33.43-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.08-.15-.64-1.55-.88-2.13-.23-.56-.47-.48-.64-.48-.16 0-.36 0-.55 0-.19 0-.5.07-.76.36-.26.29-1 1-.99 2.44.01 1.44 1.02 2.84 1.17 3.03.15.19 2 3.05 4.83 4.28.68.29 1.21.46 1.63.59.69.22 1.31.19 1.8.12.55-.08 1.7-.69 1.94-1.35.24-.65.24-1.22.17-1.35-.06-.13-.26-.21-.55-.36z"/>
    </svg>
);

const Post = ({ post, invalidateKeys = [["posts"]] }) => {
    const { postId } = useParams();

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
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [comments, setComments] = useState((post.comments || []).slice().sort((a,b)=>((b.likes?.length||0)-(a.likes?.length||0)) || (new Date(b.createdAt)-new Date(a.createdAt))));
    const [replyTarget, setReplyTarget] = useState(null); // {commentId, user}
    const [shareOpen, setShareOpen] = useState(false);
    const shareRef = useRef(null);
    const userId = authUser?._id;
    const isOwner = !!userId && post?.author?._id === userId;
    const isLiked = !!userId && (post.likes || []).includes(userId);
    const isBookmarked = Array.isArray(authUser?.bookmarks) && authUser.bookmarks.includes(post._id);

    // close share menu on outside click or Escape
    useEffect(() => {
        const onDoc = (e) => {
            if (shareOpen && shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
        };
        const onKey = (e) => { if (e.key === 'Escape') setShareOpen(false); };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
    }, [shareOpen]);

    const queryClient = useQueryClient();

    const { mutate: deletePost, isPending: isDeletingPost } = useMutation({
        mutationFn: async () => {
            await axiosInstance.delete(`/posts/delete/${post._id}`);
        },
        onSuccess: () => {
            for (const key of invalidateKeys) queryClient.invalidateQueries({ queryKey: key });
            toast.success("Post deleted successfully");
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const { mutate: createComment, isPending: isAddingComment } = useMutation({
        mutationFn: async (payload) => {
            if (payload?.replyTo) {
                await axiosInstance.post(`/posts/${post._id}/comment/${payload.replyTo}/reply`, { content: payload.content, replyToUser: payload.replyToUser });
            } else {
                await axiosInstance.post(`/posts/${post._id}/comment`, { content: payload.content });
            }
        },
        onSuccess: () => {
            for (const key of invalidateKeys) queryClient.invalidateQueries({ queryKey: key });
            toast.success("Comment added successfully");
        },
        onError: (err) => {
            toast.error(err.response.data.message || "Failed to add comment");
        },
    });

    const { mutate: likePost, isPending: isLikingPost } = useMutation({
        mutationFn: async () => {
            await axiosInstance.post(`/posts/${post._id}/like`);
        },
        onSuccess: () => {
            for (const key of invalidateKeys) queryClient.invalidateQueries({ queryKey: key });
            queryClient.invalidateQueries({ queryKey: ["post", postId] });
        },
    });

    const [likeAnim, setLikeAnim] = useState(false);
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const playLikePop = () => {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(220, ctx.currentTime);
            g.gain.setValueAtTime(0.0001, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(reduceMotion ? 0.08 : 0.18, ctx.currentTime + 0.01);
            o.connect(g); g.connect(ctx.destination);
            o.start();
            o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
            o.stop(ctx.currentTime + 0.13);
            setTimeout(()=>ctx.close(), 200);
        } catch {}
    };

    const handleDeletePost = () => {
        if (!window.confirm("Are you sure you want to delete this post?")) return;
        deletePost();
    };

    const handleLikePost = async () => {
        if (isLikingPost) return;
        // Trigger animation only when transitioning to liked
        if (!isLiked) {
            playLikePop();
            setLikeAnim(true);
            setTimeout(() => setLikeAnim(false), 650);
        }
        likePost();
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (newComment.trim()) {
            if (replyTarget?.commentId) {
                createComment({ replyTo: replyTarget.commentId, replyToUser: replyTarget.user?._id, content: newComment });
            } else {
                createComment({ content: newComment });
            }
            setNewComment("");
            setReplyTarget(null);
        }
    };

    // Share helpers
    const postUrl = `${window.location.origin}/post/${post._id}`;
    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(postUrl);
            toast.success('Link copied to clipboard');
        } catch {
            toast.error('Failed to copy link');
        } finally {
            setShareOpen(false);
        }
    };
    const shareWhatsApp = () => {
        const text = `${post.content ? post.content + ' - ' : ''}${postUrl}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        setShareOpen(false);
    };
    const shareInstagram = async () => {
        // Try Web Share first (mobile will include Instagram if available)
        if (navigator.share) {
            try {
                await navigator.share({ title: 'Check this post', text: post.content?.slice(0, 100) || 'Check this post', url: postUrl });
            } catch {
                // user canceled or unsupported target
            }
            setShareOpen(false);
            return;
        }
        // Fallback: copy link and open Instagram web
        try { await navigator.clipboard.writeText(postUrl); } catch {}
        window.open('https://www.instagram.com/', '_blank');
        toast.success('Link copied. Paste it in Instagram to share.');
        setShareOpen(false);
    };
    const shareTwitter = () => {
        const text = post.content?.slice(0, 180) || 'Check this post';
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(postUrl)}`;
        window.open(url, '_blank');
        setShareOpen(false);
    };
    const shareTelegram = () => {
        const text = post.content?.slice(0, 180) || 'Check this post';
        const url = `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        setShareOpen(false);
    };

    const [reactOpen, setReactOpen] = useState(false);
    const reactRef = useRef(null);
    useEffect(() => {
        const onDoc = (e) => { if (reactOpen && reactRef.current && !reactRef.current.contains(e.target)) setReactOpen(false) };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [reactOpen]);

    const react = async (type) => {
        try {
            await axiosInstance.post(`/posts/${post._id}/react`, { type });
            for (const key of invalidateKeys) queryClient.invalidateQueries({ queryKey: key });
            queryClient.invalidateQueries({ queryKey: ["post", postId] });
        } catch (e) {
            toast.error('Failed to react');
        } finally {
            setReactOpen(false);
        }
    };

    const toggleBookmark = async () => {
        try {
            await axiosInstance.post(`/users/bookmarks/${post._id}`);
            queryClient.invalidateQueries({ queryKey: ["authUser"] });
            for (const key of invalidateKeys) queryClient.invalidateQueries({ queryKey: key });
        } catch (e) {
            toast.error('Failed to update bookmark');
        }
    };

    return (
        <div className='bg-base-300 rounded-lg shadow mb-4'>
            <div className='p-4'>
                <div className='flex items-center justify-between mb-4'>
                    <div className='flex items-center'>
                        <Link to={`/profile/${post?.author?.username || ''}`}>
                            <img
                                src={post?.author?.profilePicture || "/avatar.png"}
                                alt={post?.author?.name || 'User'}
                                loading="lazy"
                                decoding='async'
                                width={40}
                                height={40}
                                className='size-10 rounded-full mr-3'
                            />
                        </Link>

                        <div>
                            <Link to={`/profile/${post?.author?.username || ''}`}>
                                <h3 className='font-semibold'>{post?.author?.name || 'Unknown'}</h3>
                            </Link>
                            <p className='text-xs text-info'>{post?.author?.headline || ''}</p>
                            <p className='text-xs text-info'>
                                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                            </p>
                        </div>
                    </div>
                    {isOwner && (
                        <button onClick={handleDeletePost} className='text-red-500 hover:text-red-700'>
                            {isDeletingPost ? <Loader size={18} className='animate-spin' /> : <Trash2 size={18} />}
                        </button>
                    )}
                </div>
                <p className='mb-4'>{post.content}</p>
                {post.image && <img src={post.image} alt='Post content' loading="lazy" className='rounded-lg w-full mb-4' />}

                <div className='flex justify-between text-info'>
                    {/* Like with animation */}
                    <div className='relative text-rose-500' ref={reactRef}>
                        <button className='flex items-center' onClick={handleLikePost} onContextMenu={(e)=>{ e.preventDefault(); setReactOpen(o=>!o); }}>
                            <span className='relative mr-1 inline-flex items-center justify-center'>
                                {likeAnim && (
                                    <>
                                {(() => {
                                    const inner = [
                                      { dx: 0,   dy: -36, delay: 0,   dur: 700, size: 10, scale: 1.1 },
                                      { dx: 26,  dy: -26, delay: 30,  dur: 720, size: 9,  scale: 1.0 },
                                      { dx: 36,  dy: 0,   delay: 60,  dur: 740, size: 11, scale: 1.2 },
                                      { dx: 26,  dy: 26,  delay: 90,  dur: 720, size: 9,  scale: 1.0 },
                                      { dx: 0,   dy: 36,  delay: 120, dur: 700, size: 8,  scale: 1.0 },
                                      { dx: -26, dy: 26,  delay: 150, dur: 720, size: 9,  scale: 1.0 },
                                      { dx: -36, dy: 0,   delay: 180, dur: 740, size: 12, scale: 1.2 },
                                      { dx: -26, dy: -26, delay: 210, dur: 720, size: 8,  scale: 0.9 },
                                    ];
                                    const outer = [
                                      { dx: 0,   dy: -60, delay: 120, dur: 820, size: 12, scale: 1.3 },
                                      { dx: 34,  dy: -50, delay: 150, dur: 840, size: 10, scale: 1.1 },
                                      { dx: 56,  dy: 0,   delay: 180, dur: 860, size: 13, scale: 1.35 },
                                      { dx: 34,  dy: 50,  delay: 210, dur: 840, size: 10, scale: 1.1 },
                                      { dx: 0,   dy: 60,  delay: 240, dur: 820, size: 9,  scale: 1.0 },
                                      { dx: -34, dy: 50,  delay: 270, dur: 840, size: 10, scale: 1.1 },
                                      { dx: -56, dy: 0,   delay: 300, dur: 860, size: 14, scale: 1.4 },
                                      { dx: -34, dy: -50, delay: 330, dur: 840, size: 10, scale: 1.1 },
                                    ];
                                    const palette = ['#f43f5e', '#fb7185', '#fecdd3', '#be123c'];
                                    const hearts = reduceMotion ? inner.slice(0,4) : inner.concat(outer);
                                    return hearts.map((h, i) => (
                                      <Heart
                                        key={i}
                                        className='like-heart-burst'
                                        size={h.size}
                                        style={{ color: palette[i % palette.length], "--dx": `${h.dx}px`, "--dy": `${h.dy}px`, "--delay": `${h.delay}ms`, "--dur": `${h.dur}ms`, "--scale": h.scale }}
                                        fill='currentColor'
                                      />
                                    ));
                                })()}
                                    </>
                                )}
                                <Heart size={18} className={`${likeAnim ? 'animate-like' : ''} ${isLiked ? 'text-rose-500' : ''}`} fill={isLiked ? 'currentColor' : 'none'} />
                            </span>
                            <span className='hidden sm:inline'>Like ({post.likes.length})</span>
                        </button>
                        {reactOpen && (
                            <div className='absolute z-10 -top-10 left-0 bg-base-200 rounded-full shadow px-2 py-1 flex gap-2 items-center'>
                                {[
                                    { t: 'like', emoji: '👍' },
                                    { t: 'love', emoji: '❤️' },
                                    { t: 'clap', emoji: '👏' },
                                    { t: 'laugh', emoji: '😂' },
                                    { t: 'wow', emoji: '😮' },
                                ].map(r => (
                                    <button key={r.t} className='text-lg hover:scale-110 transition' onClick={()=>react(r.t)} aria-label={r.t}>{r.emoji}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    <PostAction
                        icon={<MessageCircle size={18} />}
                        text={`Comment (${comments.length})`}
                        onClick={() => setShowComments(!showComments)}
                    />

                    <div className='relative' ref={shareRef}>
                        <PostAction icon={<Share2 size={18} />} text='Share' onClick={() => setShareOpen((s) => !s)} />
                        {shareOpen && (
                            <ul className='absolute right-0 mt-2 menu p-2 shadow bg-base-200 rounded-box w-56 z-10'>
                                <li>
                                    <button onClick={copyLink} className='flex items-center gap-2'>
                                        <LinkIcon size={16} /> Copy link
                                    </button>
                                </li>
                                <li>
                                    <button onClick={shareWhatsApp} className='flex items-center gap-2'>
                                        <WhatsAppIcon size={16} /> Share on WhatsApp
                                    </button>
                                </li>
                                <li>
                                    <button onClick={shareInstagram} className='flex items-center gap-2'>
                                        <Instagram size={16} /> Share on Instagram
                                    </button>
                                </li>
                                <li>
                                    <button onClick={shareTwitter} className='flex items-center gap-2'>
                                        <Twitter size={16} /> Share on Twitter/X
                                    </button>
                                </li>
                                <li>
                                    <button onClick={shareTelegram} className='flex items-center gap-2'>
                                        <Send size={16} /> Share on Telegram
                                    </button>
                                </li>
                            </ul>
                        )}
                    </div>

                    <PostAction
                        icon={<Bookmark size={18} className={isBookmarked ? 'text-yellow-400 fill-yellow-300' : ''} />}
                        text={isBookmarked ? 'Saved' : 'Save'}
                        onClick={toggleBookmark}
                    />
                </div>
            </div>

            {showComments && (
                <div className='px-4 pb-4'>
                    <div className='mb-4 max-h-60 overflow-y-auto'>
                        {comments.map((comment) => {
                            const likeCount = Array.isArray(comment.likes) ? comment.likes.length : 0
                            const liked = !!authUser?._id && Array.isArray(comment.likes) && comment.likes.some(id => id === authUser._id)
                            return (
                            <div key={comment._id} className='mb-2 bg-base-100 p-2 rounded'>
                                <div className='flex items-start'>
                                  <img
                                      src={comment.user?.profilePicture || "/avatar.png"}
                                      alt={comment.user?.name}
                                      loading="lazy"
                                      className='w-8 h-8 rounded-full mr-2 flex-shrink-0'
                                  />
                                  <div className='flex-grow'>
                                      <div className='flex items-center gap-2'>
                                          <span className='font-semibold'>{comment.user?.name}</span>
                                          <span className='text-xs text-info'>
                                              {formatDistanceToNow(new Date(comment.createdAt))}
                                          </span>
                                      </div>
                                      <p className='mt-1'>{comment.content}</p>
                                      <div className='mt-1 flex items-center gap-3 text-sm'>
                                        <button className='inline-flex items-center gap-1 text-info hover:text-primary' onClick={async ()=>{ try { await axiosInstance.post(`/posts/${post._id}/comment/${comment._id}/like`); for (const key of invalidateKeys) queryClient.invalidateQueries({ queryKey: key }); } catch {} }}>
                                          <ThumbsUp size={14} /> {likeCount}
                                        </button>
                                        <button className='inline-flex items-center gap-1 text-info hover:text-primary' onClick={()=> setReplyTarget({ commentId: comment._id, user: comment.user })}>
                                          <Reply size={14} /> Reply
                                        </button>
                                      </div>

                                      {Array.isArray(comment.replies) && comment.replies.length>0 && (
                                        <div className='mt-2 pl-6 space-y-2'>
                                          {comment.replies.map((r)=>(
                                            <div key={r._id} className='flex items-start'>
                                              <img src={r.user?.profilePicture || '/avatar.png'} className='w-6 h-6 rounded-full mr-2'/>
                                              <div>
                                                <div className='text-sm'>
                                                  <span className='font-semibold'>{r.user?.name}</span>
                                                  {r.replyToUser && <span className='text-info ml-1'>↦ {r.replyToUser?.name || ''}</span>}
                                                  <span className='text-xs text-info ml-2'>{formatDistanceToNow(new Date(r.createdAt))}</span>
                                                </div>
                                                <div className='text-sm'>{r.content}</div>
                                                <button className='inline-flex items-center gap-1 text-xs text-info hover:text-primary mt-1' onClick={async ()=>{ try { await axiosInstance.post(`/posts/${post._id}/comment/${comment._id}/replies/${r._id}/like`); for (const key of invalidateKeys) queryClient.invalidateQueries({ queryKey: key }); } catch {} }}>
                                                  <ThumbsUp size={12}/> {(r.likes||[]).length}
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                  </div>
                                </div>
                            </div>
                            )
                        })}
                    </div>

                    {replyTarget && (
                        <div className='mb-2 text-xs text-info'>Replying to {replyTarget.user?.name} <button className='link' onClick={()=>setReplyTarget(null)}>Cancel</button></div>
                    )}
                    <form onSubmit={handleAddComment} className='flex items-center'>
                        <input
                            type='text'
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={replyTarget ? `Reply to ${replyTarget.user?.name}...` : 'Add a comment...'}
                            className='flex-grow p-2 rounded-l-full bg-base-100 focus:outline-none focus:ring-2 focus:ring-primary'
                        />

                        <button
                            type='submit'
                            className='bg-primary text-white p-2 rounded-r-full hover:bg-primary-dark transition duration-300'
                            disabled={isAddingComment}
                        >
                            {isAddingComment ? <Loader size={18} className='animate-spin' /> : <Send size={18} />}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};
export default React.memo(Post);
