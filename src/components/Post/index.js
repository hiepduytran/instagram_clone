import { uuidv4 } from '@firebase/util';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';
import { BsBookmark, BsEmojiSmile, BsThreeDots, BsBookmarkFill } from 'react-icons/bs';
import { FaRegComment } from 'react-icons/fa';
import { IoShareOutline } from 'react-icons/io5';
import { GlobalContext } from '../../state/context/GlobalContext';
import { formatDistanceToNow, formatRelative } from 'date-fns';

import { useRouter } from 'next/router';
import EmojiPicker from 'emoji-picker-react';


const Post = ({ id, avatar, username, image, caption, likesCount, createdAt }) => {
  const router = useRouter();

  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false); // Initialize as false

  const [comments, setComments] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);


  const handleLikePost = async () => {
    // If already processing, return to prevent multiple clicks
    if (isProcessing) {
      return;
    }

    setIsProcessing(true);

    const postLike = {
      postId: id,
      userId: auth.currentUser.uid,
      username,
    };
    const likeRef = doc(db, `likes/${id}_${auth.currentUser.uid}`);
    const postRef = doc(db, `posts/${id}`);

    let updateLikeCount;

    if (isLiked) {
      await deleteDoc(likeRef);
      if (likesCount) {
        updateLikeCount = likesCount - 1;
      } else {
        updateLikeCount = 0;
      }
      await updateDoc(postRef, {
        likesCount: updateLikeCount,
      });
    } else {
      await setDoc(likeRef, postLike);
      if (likesCount) {
        updateLikeCount = likesCount + 1;
      } else {
        updateLikeCount = 1;
      }
      await updateDoc(postRef, {
        likesCount: updateLikeCount,
      });
    }

    setIsProcessing(false);
  };

  useEffect(() => {
    const likesRef = collection(db, 'likes');
    const likesQuery = query(
      likesRef,
      where('postId', '==', id),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribeLike = onSnapshot(likesQuery, (snapshot) => {
      const like = snapshot.docs.map((doc) => doc.data());
      if (like.length !== 0) {
        setIsLiked(true);
      } else {
        setIsLiked(false);
      }
    });

    const commentsRef = collection(db, `posts/${id}/comments`);
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));

    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      const comments = snapshot.docs.map((doc) => doc.data());
      setComments(comments);
    });

    const savesRef = collection(db, 'saves');
    const savesQuery = query(
      savesRef,
      where('postId', '==', id),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribeSaves = onSnapshot(savesQuery, (snapshot) => {
      const save = snapshot.docs.map((doc) => doc.data());
      if (save.length !== 0) {
        setIsBookmarked(true);
      } else {
        setIsBookmarked(false);
      }
    });
    return () => {
      unsubscribeLike();
      unsubscribeComments();
      unsubscribeSaves();
    };
  }, [id]);

  const comment = useRef(null);

  const { user } = useContext(GlobalContext);

  const handlePostComment = async (e) => {
    e.preventDefault();
    const commentData = {
      id: uuidv4(),
      username: user.username,
      comment: comment.current.value,
      createdAt: serverTimestamp(),
      replies: [], // Initialize replies array for each comment
    };
    comment.current.value = '';
    const commentRef = doc(db, `posts/${id}/comments/${commentData.id}`);
    await setDoc(commentRef, commentData);
  };

  const [replyingTo, setReplyingTo] = useState(null); // State to track reply

  const handlePostReply = async (e) => {
    e.preventDefault();
    const replyData = {
      id: uuidv4(),
      username: user.username,
      comment: comment.current.value,
    };

    // Update the Firestore document for the comment containing the reply
    const commentRef = doc(db, `posts/${id}/comments/${replyingTo.id}`);
    await updateDoc(commentRef, {
      replies: [...replyingTo.replies, replyData], // Push reply into the replies array
    });

    // Update the state with the new reply
    const updatedComments = comments.map((commentData) => {
      if (commentData.id === replyingTo.id) {
        return {
          ...commentData,
          replies: [...commentData.replies, replyData], // Push reply into the replies array
        };
      }
      return commentData;
    });

    // Update state with the new comment data
    setComments(updatedComments);

    // Clear replyToComment state
    setReplyingTo(null);

    // Clear comment input
    comment.current.value = '';
  };


  const handleSavePost = async () => {
    // If already processing, return to prevent multiple clicks
    if (isProcessing) {
      return;
    }

    setIsProcessing(true);

    const postSave = {
      postId: id,
      userId: auth.currentUser.uid,
      username,
    };
    const saveRef = doc(db, `saves/${id}_${auth.currentUser.uid}`);

    if (isBookmarked) {
      await deleteDoc(saveRef);
      setIsBookmarked(false); // Cập nhật trạng thái trực tiếp tại đây
    } else {
      await setDoc(saveRef, postSave);
      setIsBookmarked(true); // Cập nhật trạng thái trực tiếp tại đây
    }

    setIsProcessing(false);
  };

  const handleUsernameClick = () => {
    // Kiểm tra nếu username trùng với username của user đang đăng nhập
    if (username === user.username) {
      router.push('/my-profile'); // Điều hướng đến trang MyProfile
    } else {
      router.push(`/other-profile?username=${username}`); // Điều hướng đến trang OtherUserProfile
    }
  };


  const [isFullscreen, setIsFullscreen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleImageClick = () => {
    if (windowWidth >= 1280) {
      setIsFullscreen(true);
    }
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
  };

  const [commentToDeleteId, setCommentToDeleteId] = useState(null);

  const handleDeleteComment = async (commentId) => {
    try {
      const commentRef = doc(db, `posts/${id}/comments/${commentId}`);
      await deleteDoc(commentRef);

      setComments((prevComments) =>
        prevComments.filter((comment) => comment.id !== commentId)
      );

    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState(null);

  const handleOptionsClick = (commentId) => {
    setSelectedCommentId(commentId);
    setShowOptionsModal(true);
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const handleDeletePost = async () => {
    try {
      const postRef = doc(db, `posts/${id}`);
      await deleteDoc(postRef);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };


  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiClick = (event, emojiObject) => {
    // Xử lý emoji được chọn ở đây
    // emojiObject chứa thông tin về emoji (ví dụ: emojiObject.emoji)
  };


  return (
    <div className='flex flex-col w-full border border-gray-200 rounded'>
      <div className='flex items-center justify-between w-full p-2'>
        <div className='flex items-center justify-center space-x-2'>
          <div
            className='w-10 h-10 bg-gray-500 rounded-full cursor-pointer'
            onClick={handleUsernameClick}>
            <img src={avatar}
              className='rounded-full w-full h-full object-cover'
            />
          </div>
          <div
            className='cursor-pointer'
            onClick={handleUsernameClick}>
            {username}
          </div>
          <div className='text-gray-600 text-sm'>
            {createdAt && (
              <p>{`• ${formatDistanceToNow(createdAt.toDate(), { addSuffix: true })}`}</p>
            )}
          </div>
        </div>
        <div className="w-4 select-none">
          {
            username === user.username && (<BsThreeDots
              className="text-lg cursor-pointer"
              onClick={() => setShowDeleteModal(true)}
            />)
          }
        </div>
        {showDeleteModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white rounded-lg" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => {
                    handleDeletePost();
                  }}
                  className="text-red-500 font-semibold pl-[170px] pr-[170px] pt-4 pb-4 border-b border-gray-200"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-blue-600 font-semibold pt-2 pb-4"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className='relative flex items-center justify-center bg-black aspect-square'>
        {isFullscreen ? (
          <div
            className='fixed inset-0 flex items-center justify-center z-50 bg-black'
            onClick={closeFullscreen}
          >
            <img src={image} alt={caption} className='max-h-[800px] max-w-[800px]' />
          </div>
        ) : (
          <Image
            className='object-contain cursor-pointer'
            src={image}
            alt={caption}
            fill
            sizes='30'
            priority={true}
            as="image"
            onClick={handleImageClick}
          />
        )}
      </div>
      <div className='flex justify-between p-2 text-lg'>
        <div className='flex space-x-2 '>
          <div onClick={handleLikePost}>
            {isLiked ? <AiFillHeart size={25}
              className='cursor-pointer text-red-500 hover:text-red-500/50' />
              : <AiOutlineHeart size={25}
                className='cursor-pointer text-black hover:text-black/50' />
            }
          </div>
          <div>
            <div>
              <FaRegComment
                size={22}
                className='cursor-pointer text-black hover:text-black/50'
                onClick={() => comment.current.focus()}
              />
            </div>
          </div>
          <div>
            <IoShareOutline size={22} className='cursor-pointer text-black hover:text-black/50' />
          </div>
        </div>
        <div>
          {isBookmarked ? (
            <BsBookmarkFill
              size={20}
              className="cursor-pointer text-black hover:text-black/50"
              onClick={handleSavePost}
            />
          ) : (
            <BsBookmark
              size={20}
              className="cursor-pointer text-black hover:text-black/50"
              onClick={handleSavePost}
            />
          )}
        </div>

      </div>
      <div className='px-2'>{likesCount ? `${likesCount} likes` : `Be the first to like`}</div>
      <div className='px-2 break-words'>{caption}</div>
      <div className='p-2'>
        {comments.map((commentData) => (
          <div key={commentData.id}>
            <div
              className='flex flex-col space-y-1'>
              <div className='flex space-x-2'>
                <div className='font-medium'>{commentData.username}</div>
                <div className='break-words max-w-[250px] sm:max-w-[520px] md:max-w-[650px] lg:max-w-[525px]'>{commentData.comment}</div>

              </div>
            </div>
            <div className='flex items-center ml-2'>
              <div
                onClick={() => {
                  setReplyingTo(commentData); // Set the comment being replied to
                  comment.current.focus();
                }}
                className='text-xs text-gray-600 cursor-pointer'>Reply</div>

              {commentData.username === user.username && (
                <BsThreeDots
                  className='text-xs cursor-pointer ml-3 mt-[3px]'
                  onClick={() => handleOptionsClick(commentData.id)}
                />
              )}
              <div className='text-xs text-gray-600 ml-3'>
                {commentData.createdAt && (
                  <p>{`${formatRelative(commentData.createdAt.toDate(), new Date())}`}</p>
                )}
              </div>
            </div>
            {commentData.replies.map((reply) => (
              <div key={reply.id} className='ml-6'>
                <div className='font-medium'>{reply.username}</div>
                <div className='break-words'>{reply.comment}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className='relative flex items-center px-2 py-4 mt-1 space-x-3 border-t border-gray-200'>
        <div onClick={toggleEmojiPicker}>
          <BsEmojiSmile className='text-xl cursor-pointer' />
        </div>
        {showEmojiPicker && (
          <div className="absolute top-10 z-50">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}
        <form onSubmit={replyingTo ? handlePostReply : handlePostComment} className='w-full flex px-2'>
          <div className='w-full'>
            <input
              type='text'
              name={`comment ${id}`}
              id={`comment ${id}`}
              className='w-full outline-none bg-white'
              placeholder={
                replyingTo ? `Replying to ${replyingTo.username}...` : 'Add a comment...'
              }
              ref={comment}
            />
          </div>
          <div>
            <button className='text-blue-600 font-semibold text-sm'>Post</button>
          </div>
        </form>
      </div>
      {showOptionsModal && (
        <div className='fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50'
          onClick={() => {
            setSelectedCommentId(null);
            setShowOptionsModal(false);
          }}>
          <div className='bg-white rounded-lg'
            onClick={(e) => e.stopPropagation()}>
            <div className='flex flex-col space-y-2'>
              <button
                onClick={() => {
                  setCommentToDeleteId(selectedCommentId);
                  handleDeleteComment(selectedCommentId);
                  setShowOptionsModal(false);
                }}
                className='text-red-500 font-semibold pl-[170px] pr-[170px] pt-4 pb-4 border-b border-gray-200'
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setCommentToDeleteId(null);
                  setShowOptionsModal(false);
                }}
                className='text-blue-600 font-semibold pt-2 pb-4'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Post