import { useState, useEffect, useContext, useRef } from 'react'
import Header from '@/components/Header'
import { HiOutlinePencilAlt } from 'react-icons/hi'
import { BsChevronDown } from 'react-icons/bs'
import { IoCallOutline } from 'react-icons/io5'
import { BsCameraVideo, BsEmojiSmile } from 'react-icons/bs'
import { GrCircleInformation } from 'react-icons/gr'
import { PiChatsThin } from 'react-icons/pi'
import { GlobalContext, GlobalDispatchContext } from '../state/context/GlobalContext';
import { auth, db } from '../lib/firebase';
import { addDoc, getDoc, getDocs, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';


const Messages = () => {
    const { user } = useContext(GlobalContext);

    const [followedUsers, setFollowedUsers] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            if (user.id) {
                const followsCollection = collection(db, 'follows');
                const followsQuery = query(followsCollection, where('followerId', '==', user.id));
                const followsSnapshot = await getDocs(followsQuery);
                const followedUserIds = followsSnapshot.docs.map(doc => doc.data().followedId);

                if (followedUserIds.length > 0) {
                    const usersCollection = collection(db, 'users');
                    const usersQuery = query(usersCollection, where('id', 'in', followedUserIds));
                    const usersSnapshot = await getDocs(usersQuery);
                    const followedUsers = usersSnapshot.docs.map(doc => doc.data());

                    setFollowedUsers(followedUsers);
                }
            }
        };
        fetchData();
    }, [user]);


    const [selectedUser, setSelectedUser] = useState(null);

    const [message, setMessage] = useState('');
    const [chatContent, setChatContent] = useState([]);


    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setChatContent([]);
    };


    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (message.trim() !== '' && selectedUser) {
            const newMessage = {
                conversationId: `${user.id}-${selectedUser.id}`,
                text: message,
                sender: user.id,
                timestamp: new Date(),
            };

            await addDoc(collection(db, 'messages'), newMessage);

            setMessage('');

            setChatContent([...chatContent, newMessage]);
        }
    };

    useEffect(() => {
        const messagesCollection = collection(db, 'messages');
        const messagesQuery = query(messagesCollection, orderBy('timestamp'));

        const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
            const newMessages = querySnapshot.docChanges().filter(change => change.type === 'added').map(change => change.doc.data());
            setChatContent(prevChatContent => [...prevChatContent, ...newMessages]);
        });

        return () => {
            unsubscribe();
        };
    }, [selectedUser]);


    const lastMessageRef = useRef(null);

    useEffect(() => {
        if (lastMessageRef.current) {
            lastMessageRef.current.scrollIntoView();
        }
    }, [chatContent]);


    return (
        <>
            <Header />

            <div className='flex'>
                {/* left */}
                <div className='border-r-2 px-4'>
                    <div className='hidden md:flex items-center justify-center md:space-x-[150px] lg:space-x-[200px] pt-10' >
                        <div className='flex items-center justify-center space-x-1'>
                            <div className='text-2xl font-bold'>{user.username}</div>
                            <BsChevronDown />
                        </div>
                        <HiOutlinePencilAlt className='text-3xl' />
                    </div>

                    <div className='hidden md:flex items-center justify-center md:space-x-[240px] lg:space-x-[290px] mt-5'>
                        <div className='font-bold'>Messages</div>
                        <div className='text-gray-600 font-semibold'>Requests</div>
                    </div>

                    <div className='max-h-[calc(100vh-180px)] overflow-y-auto'>
                        {followedUsers.map((followedUser, i) => (
                            <div key={i}
                                className={`flex items-center py-1 my-2 md:py-5 md:my-0 md:pl-2 space-x-3 cursor-pointer ${selectedUser === followedUser ? 'bg-gray-500' : 'hover:bg-gray-300'
                                    } rounded-sm w-full`}
                                onClick={() => {
                                    handleSelectUser(followedUser);
                                }}
                            >
                                <div className="rounded-full w-10 h-10 md:w-14 md:h-14 bg-gray-600 flex-none">
                                    <img src={followedUser.avatar}
                                        className='rounded-full w-full h-full object-cover'
                                    />
                                </div>
                                <div className='hidden md:block'>{followedUser.fullName}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* right */}
                {selectedUser ? (
                    <div className='py-[7px] sm:w-[550px] md:w-[350px] lg:w-[580px] xl:w-auto'>
                        <div className='flex mt-2 md:mt-5 items-center border-b pb-6 xl:space-x-[600px] lg:space-x-[100px] md:space-x-[-120px] '>
                            <div className='flex items-center justify-center space-x-2 ml-5 no-wrap'>
                                <div className="rounded-full w-10 h-10 bg-gray-500 flex-none">
                                    <img src={selectedUser.avatar}
                                        className='rounded-full w-full h-full object-cover' />
                                </div>
                                <div className='font-medium w-[300px]'>{selectedUser ? selectedUser.fullName : ''}</div>
                            </div>
                            <div className='hidden md:flex items-center space-x-4'>
                                <IoCallOutline className='text-2xl cursor-pointer' />
                                <BsCameraVideo className='text-2xl cursor-pointer' />
                                <GrCircleInformation className='text-2xl cursor-pointer' />
                            </div>
                        </div>

                        {/* Chat content */}
                        <div className='h-[420px] sm:h-[400px] xl:h-[530px] overflow-y-auto'>
                            <>
                                <div className='flex items-center justify-center mt-12'>
                                    <div className="rounded-full w-20 h-20 bg-gray-500 flex-none">
                                        <img src={selectedUser.avatar}
                                            className='rounded-full w-full h-full object-cover' />
                                    </div>
                                </div>
                                <div className='text-center text-2xl font-medium mt-3'>
                                    {selectedUser.fullName}
                                </div>
                                <div className='text-center text-gray-500'>{selectedUser.username} · Instagram</div>
                                {/* Hiển thị nội dung chat */}
                                <div className='my-5 ml-5'>
                                    {chatContent.map((message, index) => (
                                        message.conversationId.includes(selectedUser.id) && message.conversationId.includes(user.id) ? (
                                            <div
                                                key={index}
                                                className={`flex mb-3 ${message.sender === user.id ? 'justify-end' : 'justify-start'}`}
                                                ref={index === chatContent.length - 1 ? lastMessageRef : null}
                                            >
                                                <div className={`rounded-2xl p-3 max-w-[650px] ${message.sender === user.id ? 'bg-blue-500 text-white self-end' : 'bg-gray-300'}`}>
                                                    <div className="whitespace-normal break-words">
                                                        {message.text}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : ''
                                    ))}
                                </div>
                            </>
                        </div>

                        <form className='flex justify-center items-center w-full'>
                            <div className='flex items-center rounded-full border-2 py-1 w-full'>
                                <div className='flex items-center p-2'>
                                    <BsEmojiSmile className='text-2xl' />
                                </div>
                                <input
                                    type='text'
                                    placeholder='Message...'
                                    className='flex-grow px-2 focus:outline-none'
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                <div className='p-2'>
                                    <button className='text-blue-500 font-semibold' onClick={handleSendMessage}>Send</button>
                                </div>
                            </div>
                        </form>

                    </div>) : (
                    <div className='w-full py-[243px]'>
                        <div className='flex justify-center'>
                            <div>
                                <PiChatsThin className='text-[170px]' />
                            </div>
                        </div>
                        <div className='text-center text-gray-500'>Send private photos and messages to a friend or group</div>
                    </div>
                )}
            </div >
        </>
    )
}

export default Messages