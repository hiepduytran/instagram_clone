import { useState, useEffect, useContext, useRef } from 'react';
import { auth, db, storage } from '../lib/firebase';
import { getDoc, getDocs, collection, collectionGroup, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { GlobalContext, GlobalDispatchContext } from '../state/context/GlobalContext';
import Header from '../components/Header';
import { BsGrid3X3, BsBookmark } from 'react-icons/bs';
import Image from 'next/image';
import PostModal from '../components/PostModal';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import toast from 'react-hot-toast';


const UserProfile = () => {
  const { user } = useContext(GlobalContext);
  const [posts, setPosts] = useState([]);
  const [postsCount, setPostsCount] = useState(0);
  const [savedPosts, setSavedPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('POSTS');


  useEffect(() => {
    if (user && user.username) {
      const postsRef = collection(db, 'posts');
      const postsQuery = query(postsRef, where('username', '==', user.username));

      const getPostsAndCount = async () => {
        try {
          const postsSnapshot = await getDocs(postsQuery);
          setPostsCount(postsSnapshot.size);

          const postsData = postsSnapshot.docs.map((doc) => doc.data());
          setPosts(postsData);
        } catch (error) {
          console.error('Error getting posts:', error);
        }
      };

      getPostsAndCount();
    }
  }, [user]);

  useEffect(() => {
    if (user && auth.currentUser && auth.currentUser.uid) {
      const savesRef = collection(db, 'saves');
      const savesQuery = query(
        savesRef,
        where('userId', '==', auth.currentUser.uid)
      );

      const getSavedPosts = async () => {
        try {
          const savesSnapshot = await getDocs(savesQuery);
          const savedPostIds = savesSnapshot.docs.map((doc) => doc.data().postId);

          const savedPostsRef = collection(db, 'posts');
          const savedPostsQuery =
            savedPostIds.length > 0
              ? query(savedPostsRef, where('id', 'in', savedPostIds))
              : null;

          if (savedPostsQuery) {
            const savedPostsSnapshot = await getDocs(savedPostsQuery);
            const savedPostsData = savedPostsSnapshot.docs.map((doc) =>
              doc.data()
            );
            setSavedPosts(savedPostsData);
          }
        } catch (error) {
          console.error('Error getting saved posts:', error);
        }
      };

      getSavedPosts();
    }
  }, [user]);

  const [selectedPost, setSelectedPost] = useState(null);

  const [selectedAvatar, setSelectedAvatar] = useState(null);

  const handleAvatarChange = async (event) => {
    const file = event.target.files[0];

    if (file) {
      const storageRef = ref(storage, `avatar_images/${auth.currentUser.uid}`);
      const uploadTask = uploadBytes(storageRef, file);

      try {
        await uploadTask;
        const downloadURL = await getDownloadURL(storageRef);

        const userRef = doc(db, 'users', auth.currentUser.email);

        // Cập nhật trường avatar trong collection users
        await updateDoc(userRef, { avatar: downloadURL });

        setSelectedAvatar(downloadURL);

        // Lấy danh sách bài viết của người dùng
        const postsRef = collection(db, 'posts');
        const postsQuery = query(postsRef, where('username', '==', user.username));
        const postsSnapshot = await getDocs(postsQuery);

        const postUpdatePromises = [];

        // Tạo các promise để cập nhật trường avatar trong collection posts
        postsSnapshot.forEach((postDoc) => {
          const postRef = doc(db, 'posts', postDoc.id);
          postUpdatePromises.push(updateDoc(postRef, { avatar: downloadURL }));
        });

        // Chạy tất cả các promise để cập nhật trường avatar trong collection posts
        await Promise.all(postUpdatePromises);

        toast.success('Avatar updated successfully');
      } catch (error) {
        console.error('Error uploading avatar:', error);
        toast.error('An error occurred while updating the avatar');
      }
    }
  };

  return (
    <div>
      <div className='border-b border-gray-400 sm:pb-10 pb-12'>
        <Header />
        <div className='flex justify-center mt-[50px]'>
          <div className="md:w-[150px] md:h-[150px] bg-gray-600 rounded-full w-[110px] h-[110px]">
            <img
              src={selectedAvatar || user.avatar}
              alt='User Avatar'
              className='rounded-full w-full h-full object-cover'
            />
            <div className='sm:w-[120px] bg-[#58ad27] text-center rounded-sm text-white mt-2 text-sm sm:text-base mx-auto active:scale-95'>
              <label htmlFor='avatarInput' className='cursor-pointer'>
                Change Avatar
              </label>
              <input
                type='file'
                id='avatarInput'
                accept='image/*'
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </div>

          </div>
          <div className='flex flex-col justify-center sm:ml-[250px] ml-[20px]'>
            <div className='sm:text-2xl text-xl font-medium'>{user.username}</div>
            <div className='flex justify-between mt-4 space-x-5'>
              <div>
                <span className='font-bold'>{postsCount} </span>
                posts
              </div>
              <div>
                <span className='font-bold'>{user.followersCount} </span>
                followers
              </div>
              <div>
                <span className='font-bold'>{user.followingCount} </span>
                following
              </div>
            </div>
            <div className='font-bold mt-4'>{user.fullName}</div>
          </div>
        </div>
      </div>
      <div className='flex items-center justify-center font-medium'>
        <div
          className={`flex items-center cursor-pointer hover:border-t-[2px] border-gray-400 mr-10 pt-4 ${activeTab === 'POSTS' ? 'font-bold, border-t-[2px] border-gray-400' : 'font-normal'
            }`}
          onClick={() => setActiveTab('POSTS')}
        >
          <BsGrid3X3 />
          <span className='ml-2'>POSTS</span>
        </div>
        <div
          className={`flex items-center cursor-pointer hover:border-t-[2px] border-gray-400 pt-4 ${activeTab === 'SAVED' ? 'font-bold, border-t-[2px] border-gray-400' : 'font-normal'
            }`}
          onClick={() => setActiveTab('SAVED')}
        >
          <BsBookmark />
          <span className='ml-2'>SAVED</span>
        </div>
      </div>
      <div className='flex items-center justify-center my-4'>
        {activeTab === 'POSTS' && (
          <div className='flex items-center justify-center flex-wrap'>
            {posts.length > 0 ? (
              posts
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((post) => (
                  <div
                    key={post.id}
                    className='w-[220px] h-[220px] relative cursor-pointer my-3 mx-3'
                    onClick={() => setSelectedPost(post)}
                  >
                    <Image
                      className='object-cover w-full h-full rounded-sm'
                      src={post.image}
                      alt={post.caption}
                      fill
                      sizes='30'
                      priority={true}
                      as='image'
                    />
                  </div>
                ))
            ) : (
              <p className='text-lg mt-10'>No posts.</p>
            )}
          </div>
        )}

        {activeTab === 'SAVED' && (
          <div className='flex items-center justify-center flex-wrap'>
            {savedPosts.length > 0 ? (
              savedPosts
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((post) => (
                  <div
                    key={post.id}
                    className='w-[220px] h-[220px] relative cursor-pointer my-3 mx-3'
                    onClick={() => setSelectedPost(post)}
                  >
                    <Image
                      className='object-cover w-full h-full rounded-sm'
                      src={post.image}
                      alt={post.caption}
                      fill
                      sizes='30'
                      priority={true}
                      as='image'
                    />
                  </div>
                ))
            ) : (
              <p className='text-lg mt-10'>No saved posts.</p>
            )}
          </div>
        )}
      </div>

      {selectedPost && (
        <PostModal
          post={selectedPost}
          user={user}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
};

export default UserProfile;
