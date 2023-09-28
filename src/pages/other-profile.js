import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { getDocs, collection, doc, query, setDoc, deleteDoc, updateDoc, increment, where } from 'firebase/firestore';
import Header from '../components/Header';
import Image from 'next/image';
import { BsGrid3X3 } from 'react-icons/bs';
import { useRouter } from 'next/router';
import PostModal from '../components/PostModal';

const OtherUserProfile = () => {
    const router = useRouter();

    const [otherUserPosts, setOtherUserPosts] = useState([]);
    const [otherUserProfile, setOtherUserProfile] = useState(null);
    const [postsCount, setPostsCount] = useState(0);

    const [isFollowing, setIsFollowing] = useState(false);

    const handleFollowToggle = async () => {
        try {
            const followRef = doc(db, `follows/${otherUserProfile.id}_${auth.currentUser.uid}`);

            if (isFollowing) {
                await deleteDoc(followRef);
                await updateFollowCounts(otherUserProfile.id, auth.currentUser.uid, -1);

                // Cập nhật dữ liệu ngay sau khi thay đổi
                setOtherUserProfile(prevProfile => ({
                    ...prevProfile,
                    followersCount: prevProfile.followersCount - 1
                }));
            } else {
                const followData = {
                    followedId: otherUserProfile.id,
                    followerId: auth.currentUser.uid,
                };
                await setDoc(followRef, followData);
                await updateFollowCounts(otherUserProfile.id, auth.currentUser.uid, 1);

                // Cập nhật dữ liệu ngay sau khi thay đổi
                setOtherUserProfile(prevProfile => ({
                    ...prevProfile,
                    followersCount: prevProfile.followersCount + 1
                }));
            }

            setIsFollowing(prevState => !prevState);
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    };

    const updateFollowCounts = async (followedUsername, followerUsername, incrementValue) => {
        try {
            const followedUserRef = collection(db, 'users');
            const followedUserQuery = query(followedUserRef, where('id', '==', followedUsername));
            const followedUserSnapshot = await getDocs(followedUserQuery);
            if (!followedUserSnapshot.empty) {
                const followedUserId = followedUserSnapshot.docs[0].id;
                const followedUserDocRef = doc(db, 'users', followedUserId);
                await updateDoc(followedUserDocRef, {
                    followersCount: increment(incrementValue),
                });
            }

            const followerUserRef = collection(db, 'users');
            const followerUserQuery = query(followerUserRef, where('id', '==', followerUsername));
            const followerUserSnapshot = await getDocs(followerUserQuery);
            if (!followerUserSnapshot.empty) {
                const followerUserId = followerUserSnapshot.docs[0].id;
                const followerUserDocRef = doc(db, 'users', followerUserId);
                await updateDoc(followerUserDocRef, {
                    followingCount: increment(incrementValue),
                });
            }
        } catch (error) {
            console.error('Error updating follow counts:', error);
        }
    };


    useEffect(() => {
        const checkFollowingStatus = async () => {
            try {
                if (auth.currentUser) {
                    const followsRef = collection(db, 'follows');
                    const followsQuery = query(
                        followsRef,
                        where('followedId', '==', otherUserProfile.id),
                        where('followerId', '==', auth.currentUser.uid)
                    );
                    const followsSnapshot = await getDocs(followsQuery);

                    setIsFollowing(!followsSnapshot.empty);
                }
            } catch (error) {
                console.error('Error checking following status:', error);
            }
        };

        if (otherUserProfile) {
            checkFollowingStatus();
        }
    }, [otherUserProfile]);

    useEffect(() => {
        if (router.query.username) {
            const getOtherUserPosts = async () => {
                try {
                    const postsRef = collection(db, 'posts');
                    const postsQuery = query(postsRef, where('username', '==', router.query.username));
                    const postsSnapshot = await getDocs(postsQuery);
                    const postsData = postsSnapshot.docs.map((doc) => doc.data());
                    setOtherUserPosts(postsData);

                    setPostsCount(postsData.length);
                } catch (error) {
                    console.error('Error getting other user posts:', error);
                }
            };

            getOtherUserPosts();
        }
    }, [router.query.username]);

    useEffect(() => {
        const getOtherUserProfile = async () => {
            try {
                const userProfileRef = collection(db, 'users');
                const userProfileQuery = query(userProfileRef, where('username', '==', router.query.username));
                const userProfileSnapshot = await getDocs(userProfileQuery);

                if (!userProfileSnapshot.empty) {
                    const userProfileData = userProfileSnapshot.docs[0].data();
                    setOtherUserProfile(userProfileData);
                } else {
                    console.log('User profile does not exist');
                }
            } catch (error) {
                console.error('Error getting other user data:', error);
            }
        };

        if (router.query.username) {
            getOtherUserProfile();
        }
    }, [router.query.username]);

    const [selectedPost, setSelectedPost] = useState(null);

    return (
        <div>
            <div className='border-b border-gray-400 sm:pb-10 pb-12'>
                <Header />
                <div className='flex justify-center mt-[50px]'>
                    <div className="md:w-[150px] md:h-[150px] bg-gray-600 rounded-full w-[100px] h-[100px] sm:w-[110px] sm:h-[110px]">
                        {otherUserProfile !== null ? (
                            <img
                                src={otherUserProfile.avatar}
                                className='w-full h-full rounded-full object-cover'
                            />
                        ) : (
                            ''
                        )}
                    </div>
                    <div className='flex flex-col justify-center sm:ml-[250px] ml-[20px]'>
                        <div className='sm:text-2xl text-xl font-medium max-w-[150px] break-words'>{router.query.username}</div>
                        <div className='flex justify-between mt-4 sm:space-x-5 space-x-1'>
                            <div>
                                <span className='font-bold'>{postsCount} </span>
                                posts
                            </div>
                            <div>
                                <span className='font-bold'>{otherUserProfile?.followersCount || 0} </span>
                                followers
                            </div>
                            <div>
                                <span className='font-bold'>{otherUserProfile?.followingCount || 0} </span>
                                following
                            </div>
                        </div>
                        <div className='font-bold mt-4'>{otherUserProfile?.fullName}</div>
                    </div>
                    <button
                        className={`bg-[#0095F6] py-1.5 w-[80px] md:w-[130px] h-4/5 text-white active:scale-95 rounded 
                        text-sm font-semibold md:mt-5 ml-[-130px] ${isFollowing ? 'opacity-50' : ''}`}
                        onClick={handleFollowToggle}
                    >
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                </div>
            </div>
            <div className='flex items-center justify-center font-medium'>
                <div className='flex items-center justify-center cursor-pointer border-t-[2px] border-gray-400 pt-4 font-bold text-center space-x-2'>
                    <BsGrid3X3 />
                    <div>POSTS</div>
                </div>
            </div>
            <div className='flex items-center justify-center my-4'>
                <div className='flex items-center justify-center flex-wrap'>
                    {otherUserPosts.length > 0 ? (
                        otherUserPosts
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
            </div>
            {selectedPost && (
                <PostModal
                    post={selectedPost}
                    onClose={() => setSelectedPost(null)}
                />
            )}
        </div>
    );
};

export default OtherUserProfile;
