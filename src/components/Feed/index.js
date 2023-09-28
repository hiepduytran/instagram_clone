import { useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
    GlobalContext,
    GlobalDispatchContext,
} from '../../state/context/GlobalContext';
import Header from '../Header';
import Modal from '../Modal';
import Post from '../Post';
import { db, storage } from '../../lib/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { uuidv4 } from '@firebase/util';
import {
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    increment,
    where
} from 'firebase/firestore';
import Lottie from 'react-lottie-player';
import MediaUpload from '../../../public/assets/animations/media-upload.json';

const Feed = () => {
    const { isUploadPostModalOpen } = useContext(GlobalContext);
    const dispatch = useContext(GlobalDispatchContext);

    const closeModal = () => {
        dispatch({
            type: 'SET_IS_UPLOAD_POST_MODAL_OPEN',
            payload: {
                isUploadPostModalOpen: false,
            },
        });
    };

    const [file, setFile] = useState('');

    const [media, setMedia] = useState({
        src: '',
        isUploading: false,
        caption: '',
    });

    useEffect(() => {
        const reader = new FileReader();

        const handleEvent = (e) => {
            switch (e.type) {
                case 'load':
                    return setMedia((prev) => ({
                        ...prev,
                        src: reader.result,
                    }));
                case 'error':
                    console.log(e);
                    return toast.error('Something not working');
                default:
                    return;
            }
        };

        if (file) {
            reader.addEventListener('load', handleEvent);
            reader.addEventListener('error', handleEvent);
            reader.readAsDataURL(file);
        }

        return () => {
            reader.removeEventListener('load', handleEvent);
            reader.removeEventListener('error', handleEvent);
        };
    }, [file]);

    const currentImage = useRef(null);

    const { user } = useContext(GlobalContext);

    const handlePostMedia = async (url) => {
        const postId = uuidv4();
        const postRef = doc(db, 'posts', postId);
        const post = {
            avatar: user.avatar,
            id: postId,
            image: url,
            caption: media.caption,
            username: user.username,
            createdAt: serverTimestamp(),
        };
        try {
            await setDoc(postRef, post);
        } catch (error) {
            console.error(error);
            toast.error('Error posting the image');
        }
    };

    const handleUploadPost = async () => {
        if (!file) return toast.error('Please select a image first');
        setMedia((prev) => ({ ...prev, isUploading: true }));

        const toastId = toast.loading('Uploading your post, wait a minute...');
        const postName = `post_images/${uuidv4()}-${file.name}`;

        const storageRef = ref(storage, postName);

        try {
            const uploadTask = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(uploadTask.ref);
            await handlePostMedia(url);
            toast.success('Image has uploaded', {
                id: toastId,
            });
        } catch (error) {
            toast.error('Failed to upload the image', {
                id: toastId,
            });
        } finally {
            setMedia({
                src: '',
                isUploading: false,
                caption: '',
            });
            setFile('');
            closeModal();
        }
    };

    const handleRemovePost = () => {
        setFile('');
        setMedia({
            src: '',
            isUploading: false,
            caption: '',
        });
        currentImage.current.src = '';
    };

    // const [loading, setLoading] = useState(false);
    if (!user.id) {
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    const [suggestedUsers, setSuggestedUsers] = useState([]);

    useEffect(() => {
        if (user.id) {
            const fetchSuggestedUsers = async () => {
                const usersCollection = collection(db, 'users');
                const usersSnapshot = await getDocs(usersCollection);

                // Lấy danh sách người dùng đã theo dõi từ Firestore
                const followsCollection = collection(db, 'follows');
                const followsQuery = query(followsCollection, where('followerId', '==', user.id));
                const followsSnapshot = await getDocs(followsQuery);
                const followedUserIds = followsSnapshot.docs.map(doc => doc.data().followedId);

                // Lọc ra danh sách người dùng gợi ý, loại bỏ những người đã được theo dõi
                const suggestedUserIds = usersSnapshot.docs
                    .filter(doc => doc.data().id !== user.id && !followedUserIds.includes(doc.data().id))
                    .map(doc => doc.data());
                setSuggestedUsers(suggestedUserIds);

            };

            fetchSuggestedUsers();
        }
    }, [user]);


    const handleFollow = async (index) => {
        const updatedUsers = [...suggestedUsers];
        const followedUsername = updatedUsers[index]; // Lấy username của người dùng đang được theo dõi
        updatedUsers.splice(index, 1);
        setSuggestedUsers(updatedUsers);

        try {
            // Tìm userId dựa trên followedUsername
            const usersCollection = collection(db, 'users');
            const usersSnapshot = await getDocs(usersCollection);
            const followedUserDoc = usersSnapshot.docs.find(doc => doc.data().username === followedUsername.username);

            if (followedUserDoc) {
                const followedUserId = followedUserDoc.data().id;

                const followRef = doc(db, 'follows', `${followedUserId}_${user.id}`);
                await setDoc(followRef, {
                    followedId: followedUserId,
                    followerId: user.id, // Đảm bảo bạn có thông tin user.id trong context
                });

                // Cập nhật followersCount cho người được theo dõi
                const followedUserDocRef = doc(db, 'users', followedUserDoc.id);
                await updateDoc(followedUserDocRef, {
                    followersCount: increment(1),
                });
                // Cập nhật followingCount cho người đang theo dõi bằng email
                const followerUserDocRef = doc(db, 'users', user.email); // Thay thế followerUserId thành user.email
                await updateDoc(followerUserDocRef, {
                    followingCount: increment(1),
                });
            }
        } catch (error) {
            console.error('Error following user:', error);
        }
    };

    const [followedPosts, setFollowedPosts] = useState([]);
    const [followedUsernames, setFollowedUsernames] = useState([]); // Định nghĩa biến followedUsernames


    const fetchFollowedPosts = async () => {
        const followedUsernames = [user.username]; // Thêm tên người dùng hiện tại vào danh sách

        const followsCollection = collection(db, 'follows');
        const followsQuery = query(followsCollection, where('followerId', '==', user.id));
        const followsSnapshot = await getDocs(followsQuery);

        if (!followsSnapshot.empty) {
            const followedUserIds = followsSnapshot.docs.map(doc => doc.data().followedId);

            const usersCollection = collection(db, 'users');
            const usersQuery = query(usersCollection, where('id', 'in', followedUserIds));
            const usersSnapshot = await getDocs(usersQuery);
            const additionalUsernames = usersSnapshot.docs.map(doc => doc.data().username);

            followedUsernames.push(...additionalUsernames);
        }

        setFollowedUsernames(followedUsernames);

        const followedPostsCollection = collection(db, 'posts');
        const q = query(followedPostsCollection, where('username', 'in', followedUsernames), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const posts = snapshot.docs.map(doc => doc.data());
            setFollowedPosts(posts);
        });

        return () => {
            unsubscribe();
        };
    };

    useEffect(() => {
        if (user.id) {
            fetchFollowedPosts();
        }
    }, [user.id]);
    return (
        <div className="w-full h-screen bg-[#FAFAFA]">
            <div
                className='pl-[20px] lg:pl-0'
            >
                <Header user={user} />
            </div>
            <Modal closeModal={closeModal} isOpen={isUploadPostModalOpen}>
                <div className="w-screen h-screen max-w-3xl max-h-[70vh] flex flex-col items-center">
                    <div className="w-full py-4 text-3xl font-bold text-center border-b border-black">
                        Create new post
                    </div>
                    {file ? null : (
                        <Lottie
                            play
                            loop
                            animationData={MediaUpload}
                            className='max-w-[200px] select-none mt-14'
                        />
                    )}
                    <div className="flex items-center justify-center w-full h-full">
                        {!file ? (
                            <>
                                <label
                                    htmlFor="post"
                                    className="bg-[#0095F6] py-2 px-4 text-white active:scale-95 transform transition disabled:bg-opacity-50 select-none cursor-pointer disabled:scale-100 rounded text-lg font-semibold"
                                >
                                    Select from computer
                                </label>

                                <input
                                    onChange={(e) => setFile(e.target.files[0])}
                                    value={file.name}
                                    type="file"
                                    name="post"
                                    id="post"
                                    className="hidden"
                                    multiple={false}
                                    accept=".jpg, .jpeg, .png, .gif, .mp4, .mov"
                                />

                            </>
                        ) : (
                            <div className="flex flex-col p-5 gap-y-4">
                                <input
                                    type="image"
                                    src={media.src}
                                    className="sm:max-w-[300px] sm:max-h-[300px] max-w-[220px] max-h-[220px]"
                                    ref={currentImage}
                                />
                                <input
                                    type="text"
                                    name="caption"
                                    id="caption"
                                    placeholder="Type your caption (optional...)"
                                    onChange={(e) =>
                                        setMedia((prev) => ({ ...prev, caption: e.target.value }))
                                    }
                                    value={media.caption}
                                    className="w-full px-2 py-4 bg-gray-100 border rounded outline-none hover:bg-transparent focus:bg-transparent focus:border-gray-400"
                                />
                                <div className="flex items-center justify-center w-full gap-x-6">
                                    <button
                                        className="bg-[#0095F6] py-2 px-4 text-white active:scale-95 transform transition  disabled:bg-opacity-50 select-none cursor-pointer disabled:scale-100 rounded text-lg font-semibold"
                                        onClick={handleRemovePost}
                                    >
                                        Remove
                                    </button>
                                    <button
                                        className="bg-[#0095F6] py-2 px-4 text-white active:scale-95 transform transition  disabled:bg-opacity-50 select-none cursor-pointer disabled:scale-100 rounded text-lg font-semibold"
                                        onClick={handleUploadPost}
                                    >
                                        Upload
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
            <div className="w-full max-w-screen-lg mx-auto mt-20 pl-[20px] lg:grid lg:grid-cols-3 lg:gap-6 ">
                <div className="flex flex-col w-full col-span-2 space-y-5 border-t-1 border-gray-200">
                    {/* stories section */}
                    <section className="flex items-center justify-center p-4 space-x-4 overflow-x-scroll bg-white border border-black/10 rounded">
                        {new Array(10).fill(0).map((_, i) => (
                            <div
                                key={i}
                                className="rounded-full w-14 ring-[2px] ring-blue-500 ring-offset-2 h-14 bg-gray-500 flex-none"
                            >
                                <img src='https://firebasestorage.googleapis.com/v0/b/insta-clone-c7ce9.appspot.com/o/anh-meme-meo-cute-cuc-cung.jpg?alt=media&token=56384662-ccf5-4f1d-bf5d-15564a67fc5a'
                                    className="rounded-full w-full h-full"
                                />
                            </div>
                        ))}
                    </section>

                    {/* posts section */}
                    <section className="flex flex-col gap-y-10">
                        {followedPosts
                            .sort((a, b) => b.createdAt - a.createdAt)
                            .map((post) =>
                            (post.username === user.username || followedUsernames.includes(post.username) || post.username === user.username ? (
                                <Post key={post.id} {...post} />
                            ) : null)
                            )}

                    </section>
                </div>
                {/* this is our sidebar */}
                <section className="w-full h-full ml-5 mt-5">
                    {/* Switch */}
                    <div className='flex items-center justify-center space-x-5'>
                        <div>
                            <div

                                className='w-[65px] h-[65px] bg-gray-600 rounded-full'>
                                <img src={user.avatar}
                                    className='rounded-full w-full h-full object-cover'
                                />
                            </div>
                        </div>
                        <div className='w-[150px]'>
                            <div>{user.fullName}</div>
                            <div>{user.username}</div>
                        </div>
                        <div className='text-[#0095F6] cursor-pointer font-semibold'>Switch</div>
                    </div>
                    {/* Suggestions */}
                    <div className='flex items-center justify-center flex-col space-y-3 mt-5'>
                        <div className='flex items-center space-x-[107px]'>
                            <div className='font-semibold text-gray-500'>Suggestions For You</div>
                            <div className='cursor-pointer font-semibold text-[14px] pr-2'>See All</div>
                        </div>

                        <div>
                            {suggestedUsers.slice(0, 3).map((user, index) => (
                                <div className='flex items-center' key={index}>
                                    <div
                                        className='rounded-full w-14 h-14 bg-gray-600 mt-3'>
                                        <img src={user.avatar}
                                            className='rounded-full w-full h-full object-cover' />
                                    </div>
                                    <div className='ml-2 min-w-[190px]'>{user.username}</div>
                                    <div
                                        className='text-[#0095F6] cursor-pointer font-semibold'
                                        onClick={() => handleFollow(index)}
                                    >
                                        Follow
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className='font-medium text-gray-500'>© 2023 INSTAGRAM FROM hiepduytran</div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Feed;
