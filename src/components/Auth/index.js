import { useContext, useMemo, useState } from 'react';
import Lottie from 'react-lottie-player';
import AuthAnimation from '../../../public/assets/animations/auth-page-animation.json';
import useForm from '../../hooks/useForm';
import { AiFillFacebook } from 'react-icons/ai';
import { GlobalContext, GlobalDispatchContext } from '../../state/context/GlobalContext';
import { auth, db } from '../../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { handlePromise } from '../../utils/handlePromise';
import { toast } from 'react-hot-toast';
import LoadingOverLay from '../LoadingOverLay';
import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import useFetchCurrentUser from '../../utils/fetchCurrentUser';
import TextLogo from '../../../public/assets/images/instagram-logo-text-black-png.png';

const Auth = () => {
  const [isLoginForm, setIsLoginForm] = useState(false);

  const { isAuthenticated, isOnboarded, user, isLoading } = useContext(GlobalContext);

  const { fetchUser } = useFetchCurrentUser();

  const dispatch = useContext(GlobalDispatchContext);

  const { form, onChangeHandle, resetForm } = useForm({
    email: '',
    password: '',
  });

  const { form: onBoardingForm, onChangeHandle: onBoardingFormOnChangeHandle } = useForm({
    username: '',
    fullName: '',
  });

  const authenticate = async () => {
    if (isLoginForm) {
      const [data, loginError] = await handlePromise(signInWithEmailAndPassword(auth, form.email, form.password));
      return loginError;
    } else {
      const [data, signupError] = await handlePromise(createUserWithEmailAndPassword(auth, form.email, form.password));
      return signupError;
    }
  };

  const setUserData = async () => {
    try {
      const userCollection = collection(db, 'users');
      const userQuery = query(userCollection, where('username', '==', onBoardingForm.username));
      const usersSnapshot = await getDocs(userQuery);

      if (usersSnapshot.docs.length > 0) {
        toast.error('Username already exists');
        return;
      }

      await setDoc(doc(db, 'users', auth.currentUser.email), {
        fullName: onBoardingForm.fullName,
        username: onBoardingForm.username,
        email: auth.currentUser.email,
        id: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        followersCount: 0,
        followingCount: 0,
        avatar: 'https://firebasestorage.googleapis.com/v0/b/insta-clone-c7ce9.appspot.com/o/avatar_images%2Fdefault-avatar.png?alt=media&token=4c06933d-bfe4-47ee-80a8-3319f18ddd8a',
      });

      toast.success('Welcome to instagram clone by hiepduytran');

      dispatch({
        type: 'SET_IS_ONBOARDED',
        payload: {
          isOnboarded: true,
        },
      });
    } catch (error) {
      console.log(error);
    }
  };

  const submitHandle = async (e) => {
    e.preventDefault();
    dispatch({
      type: 'SET_LOADING',
      payload: {
        isLoading: true,
      },
    });

    // Validate 
    let error = null;

    // Check the password format
    if (!/^(?=.*[A-Z]).{8,}$/.test(form.password)) {
      toast.error('Password must be at least 8 characters long and contain at least 1 uppercase letter.');
      dispatch({
        type: 'SET_LOADING',
        payload: {
          isLoading: false,
        },
      });
      return;
    }

    // Check the email format
    if (!form.email.toLowerCase().endsWith('@gmail.com')) {
      toast.error('Email address must have the suffix "@gmail.com".');
      dispatch({
        type: 'SET_LOADING',
        payload: {
          isLoading: false,
        },
      });
      return;
    }

    error = await authenticate();

    // await fetchUser();
    // check if the user data exists in the db
    const userData = await fetchUser();

    if (userData) {
      dispatch({
        type: 'SET_USER',
        payload: {
          user: userData,
        },
      });
      dispatch({
        type: 'SET_IS_ONBOARDED',
        payload: {
          isOnboarded: true,
        },
      });
    }

    dispatch({
      type: 'SET_LOADING',
      payload: {
        isLoading: false,
      },
    });

    if (error) toast.error(error.message);
    if (!error)
      toast.success(`You have successfully ${isLoginForm ? 'logged in' : 'signed up'}`);
    resetForm();
  };

  const isDisabled = useMemo(() => {
    return !Object.values(form).every((val) => !!val);
  }, [form]);

  const onBoardingSubmitHandle = async (e) => {
    e.preventDefault();
    dispatch({
      type: 'SET_LOADING',
      payload: {
        isLoading: true,
      },
    });
    await setUserData();
    dispatch({
      type: 'SET_LOADING',
      payload: {
        isLoading: false,
      },
    });
  };

  return (
    <div className='w-screen h-screen flex items-center justify-center bg-[#FAFAFA]'>

      <div className='flex h-[70%] w-[70%]'>
        <div className='w-full h-full hidden md:block xl:mt-[-50px]'>
          <Lottie
            play
            loop
            animationData={AuthAnimation}
          />
        </div>

        <div className='w-full flex flex-col space-y-5'>

          <div className='relative w-full bg-white border flex flex-col space-y-5 border-gray-300 p-10'>
            {isLoading && <LoadingOverLay />}
            {!isAuthenticated && <form onSubmit={submitHandle} className='flex flex-col items-center space-y-5'>
              <div className='w-1/2'>
                <img className='pointer-events-none' src={TextLogo.src}></img>
              </div>
              <input
                type='email'
                name='email'
                id='email'
                onChange={onChangeHandle}
                value={form.email}
                className='bg-gray-100 border hover:bg-transparent focus:bg-transparent placeholder:text-sm rounded-sm focus:border-gray-400 py-1 px-2 outline-none w-full'
                placeholder='Email' />
              <input
                type='password'
                name='password'
                id='password'
                onChange={onChangeHandle}
                value={form.password}
                className='bg-gray-100 border hover:bg-transparent focus:bg-transparent placeholder:text-sm rounded-sm focus:border-gray-400 py-1 px-2 outline-none w-full'
                placeholder='Password' />
              <button
                type='submit'
                className='bg-[#0095F6] py-1 text-white active:scale-95 transform trasition w-full 
                                disabled:bg-opacity-50 disabled:scale-100 rounded text-sm font-semibold'
                disabled={isDisabled}
              >
                {isLoginForm ? 'Log in' : 'Sign up'}
              </button>
            </form>}

            {isAuthenticated && !isOnboarded && <form onSubmit={onBoardingSubmitHandle} className='flex flex-col items-center space-y-5'>
              <div className='w-1/2'>
                <img className='pointer-events-none' src={TextLogo.src}></img>
              </div>
              <input
                type='username'
                name='username'
                id='username'
                onChange={onBoardingFormOnChangeHandle}
                value={onBoardingForm.username}
                className='bg-gray-100 border hover:bg-transparent focus:bg-transparent placeholder:text-sm rounded-sm focus:border-gray-400 py-1 px-2 outline-none w-full'
                placeholder='Username' />
              <input
                type='fullName'
                name='fullName'
                id='fullName'
                onChange={onBoardingFormOnChangeHandle}
                value={onBoardingForm.fullName}
                className='bg-gray-100 border hover:bg-transparent focus:bg-transparent placeholder:text-sm rounded-sm focus:border-gray-400 py-1 px-2 outline-none w-full'
                placeholder='Full Name' />
              <button
                type='submit'
                className='bg-[#0095F6] py-1 text-white active:scale-95 transform trasition w-full 
                                disabled:bg-opacity-50 disabled:scale-100 rounded text-sm font-semibold'
                disabled={!onBoardingForm.username || !onBoardingForm.fullName}
              >
                Submit
              </button>
            </form>}

            <div className='w-full flex items-center justify-center my-5 space-x-2'>
              <div className='h-[0.8px] w-full bg-slate-400'></div>
              <div className='text-gray-400 font-semibold text-center text-sm'>
                OR
              </div>
              <div className='h-[0.8px] w-full bg-slate-400'></div>
            </div>
            <div className='w-full text-center text-indigo-900 flex items-center justify-center'>
              <AiFillFacebook className='inline-block text-2xl mr-2' />
              <span className='font-semibold text-sm'>{isLoginForm ? 'Log in' : 'Sign up'} with Facebook</span>
            </div>
            {isLoginForm && <div className='w-full text-xs text-center text-indigo-900'>
              Forgotten your password?
            </div>}
          </div>
          <div className='w-full bg-white border text-sm space-y-5 border-gray-300 py-5 text-center'>
            {isLoginForm ? "Don't have account?" : 'Already have an account?'}
            <button onClick={() => setIsLoginForm((prev) => (!prev))}
              className='text-blue-600 ml-2 font-semibold'>
              {isLoginForm ? 'Sign up' : 'Log in'}
            </button>
          </div>

        </div>

      </div>

    </div>
  )
}

export default Auth