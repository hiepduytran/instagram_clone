import { useState, useEffect } from 'react';
import { auth, db, storage } from '../../lib/firebase';
import { getDoc, getDocs, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { BsThreeDots } from 'react-icons/bs';
import { formatDistanceToNow } from 'date-fns';


const PostModal = ({ post, onClose }) => {
    const [comments, setComments] = useState([]);

    useEffect(() => {
        // Truy vấn để lấy danh sách bình luận từ bài viết
        const fetchComments = async () => {
            try {
                const commentsRef = collection(db, 'posts', post.id, 'comments');
                const commentsSnapshot = await getDocs(commentsRef);
                const commentsData = commentsSnapshot.docs.map((commentDoc) => commentDoc.data());
                setComments(commentsData);
            } catch (error) {
                console.error('Error getting comments:', error);
            }
        };

        fetchComments();
    }, [post.id]);
    const handleOverlayClick = (event) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    const [showAllComments, setShowAllComments] = useState(false);
    const maxCommentsToShow = 8; // Số lượng comment tối đa để hiển thị

    const visibleComments = showAllComments
        ? comments
        : comments.slice(0, maxCommentsToShow);

    const toggleComments = () => {
        setShowAllComments(!showAllComments);
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={handleOverlayClick}>
            <div className="flex items-center justify-center bg-black rounded-sm">
                <img className="max-w-[170px] max-h-[150px] sm:max-w-[300px] sm:max-h-[250px] md:max-h-[200px] lg:max-w-[700px] lg:max-h-[300px]" src={post.image} alt={post.caption} />
                <div className="bg-white rounded-sm">
                    <div className="flex items-center space-x-3 ml-5 mt-3">
                        <div className="rounded-full w-8 h-8 sm:w-12 sm:h-12 bg-gray-500 flex-none">
                            <img src={post.avatar}
                                className='rounded-full w-full h-full object-cover'
                            />
                        </div>
                        <div className="text-base md:text-lg">{post.username}</div>
                        <div className='text-gray-600 text-sm'>
                            {post.createdAt && (
                                <p>{`• ${formatDistanceToNow(post.createdAt.toDate(), {
                                    addSuffix: true,
                                })}`}</p>
                            )}
                        </div>
                        <div className="pr-5">
                            <BsThreeDots className="md:ml-[200px] text-lg" />
                        </div>
                    </div>
                    <div className="h-[120px] sm:h-[200px] md:h-[250px] overflow-y-scroll ml-10 mt-4 md:mt-6">
                        {visibleComments.length === 0 ? (
                            <p className="text-sm md:text-lg text-center mt-20">No comments.</p>
                        ) : (
                            visibleComments.map((item) => (
                                <div key={item.id}
                                    className='mb-2'
                                >
                                    <span className="mr-2 font-bold text-sm md:text-base">{item.username}</span>
                                    <div className='max-w-[150px] sm:max-w-[200px] md:max-w-[430px] break-words'>{item.comment}</div>
                                    {item.replies.length > 0 && (
                                        <div className="ml-8">
                                            {item.replies.map((reply) => (
                                                <div key={reply.id}>
                                                    <span className="mr-2 font-semibold text-sm md:text-base">{reply.username}</span>
                                                    <div className='max-w-[100px] sm:max-w-[180px] md:max-w-[380px] break-words'>
                                                        {reply.comment}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        {comments.length > maxCommentsToShow && (
                            <button className="text-blue-500 active:scale-95" onClick={toggleComments}>
                                {showAllComments ? 'Hide' : 'See more'}
                            </button>
                        )}
                    </div>
                    <div className="ml-5 mb-2 mt-2 text-sm md:text-base">
                        <div>
                            <span className="font-bold mr-2">{post.username}</span>
                            {post.caption === "" ? "No Caption" : post.caption}
                        </div>
                        <div>
                            {post.likesCount === undefined ? "0" : post.likesCount} likes
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default PostModal;
