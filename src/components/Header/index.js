import React from 'react';
import { useState, useEffect } from 'react';
import { BsSearch } from 'react-icons/bs';
import HeaderIcon from './HeaderIcon';
import toast from 'react-hot-toast';
import {
    Add,
    Home,
    Heart,
    Messenger,
    Compass,
    Profile,
} from './HeaderIcons';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useRouter } from 'next/router';
import TextLogo from '../../../public/assets/images/instagram-logo-text-black-png.png';
import { FiMenu } from 'react-icons/fi';
import ReactModal from 'react-modal';

const HEADER_ITEMS = [
    {
        icon: Home,
        url: '/',
        name: 'Home',
    },
    {
        icon: Messenger,
        url: '/',
        name: 'Messenger',
    },
    {
        icon: Add,
        url: '/',
        name: 'Add',
    },
    {
        icon: Compass,
        url: '/',
        name: 'Discover',
    },
    {
        icon: Heart,
        url: '/',
        name: 'Likes',
    },
    {
        icon: Profile,
        url: '/',
        name: 'Profile',
    }
]
const Header = ({ user }) => {

    const router = useRouter();

    const handleLogOut = async () => {
        router.push('/');
        await signOut(auth);
        window.location.reload();
    };

    const [searchUsername, setSearchUsername] = useState('');
    const [existingUsernames, setExistingUsernames] = useState([]);

    useEffect(() => {
        const delay = setTimeout(() => {
            if (searchUsername) {
                const fetchExistingUsernames = async () => {
                    const usersRef = collection(db, 'users');
                    const q = query(usersRef, where('username', '>=', searchUsername));

                    const querySnapshot = await getDocs(q);
                    const usernames = querySnapshot.docs.map((doc) => doc.data().username);

                    setExistingUsernames(usernames);
                };

                fetchExistingUsernames();
            } else {
                setExistingUsernames([]);
            }
        }, 300); // Chờ 300ms trước khi thực hiện yêu cầu

        return () => clearTimeout(delay); // Xóa bộ đếm thời gian chờ khi useEffect chạy lại
    }, [searchUsername]);


    const handleSearchEnter = (event) => {
        if (event.key === 'Enter') {
            handleSearchResultClick();
        }
    };

    const checkUsernameExists = async (username) => {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));

        const querySnapshot = await getDocs(q);

        return !querySnapshot.empty;
    };

    const handleSearchResultClick = async () => {
        if (searchUsername === user.username) {
            router.push('/my-profile');
        } else {
            if (!(await checkUsernameExists(searchUsername))) {
                toast.error('User does not exist');
                return;
            }
            router.push(`/other-profile?username=${searchUsername}`);
        }
    };

    const [isModalOpen, setIsModalOpen] = useState(false);


    return (
        <>
            <header className='w-full flex items-center justify-around h-16 bg-white shadow-lg'>
                <div className='max-w-[180px] cursor-pointer hidden md:block' onClick={() => router.push('/')}>
                    <img src={TextLogo.src}></img>
                </div>
                <div className='flex bg-gray-100 space-x-4 border items-center border-gray-400 rounded-lg px-2 group group-focus:border-gray-400'>
                    <label htmlFor='search' className=''>
                        <BsSearch className='text-lg border-gray-400' />
                    </label>
                    <input
                        type='search'
                        name='search'
                        id='search'
                        className='bg-gray-100 max-w-[150px] md:w-full rounded-sm px-2 py-1 outline-none transition hover:bg-transparent focus:bg-transparent placeholder:text-sm'
                        placeholder='Search'
                        value={searchUsername}
                        onChange={(e) => setSearchUsername(e.target.value)}
                        onKeyPress={handleSearchEnter}
                        onFocus={() => setExistingUsernames([])}
                        list='username-suggestions'
                    />
                    <datalist id='username-suggestions'>
                        {existingUsernames.map((username) => (
                            <option key={username} value={username} />
                        ))}
                    </datalist>
                </div>
                <div className='flex space-x-2 items-center'>
                    <div className='hidden md:flex space-x-4'>
                        {
                            HEADER_ITEMS.map((item) => (
                                <HeaderIcon
                                    key={item.name}
                                    Icon={item.icon}
                                    name={item.name}
                                />
                            ))
                        }
                    </div>
                    <FiMenu className='text-2xl cursor-pointer md:hidden' onClick={() => setIsModalOpen(!isModalOpen)} />
                    <div>
                        <button onClick={handleLogOut} className='bg-[#0095F6] py-1 h-4/5 text-white active:scale-95 px-2 md:px-6 
                    rounded text-sm font-semibold md:w-[98px] lg:w-full'>Log out</button>
                    </div>
                </div>
            </header>
            <ReactModal
                isOpen={isModalOpen}
                onRequestClose={() => setIsModalOpen(false)}
                className='absolute left-0 top-0 bg-white h-full flex flex-col justify-center items-center'
            >
                {HEADER_ITEMS.map((item) => (
                    <HeaderIcon
                        key={item.name}
                        Icon={item.icon}
                        name={item.name}
                    />
                ))}
            </ReactModal>

        </>
    )
}

export default Header