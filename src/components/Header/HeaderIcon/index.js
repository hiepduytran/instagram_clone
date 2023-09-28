import { useContext } from 'react';
import { GlobalDispatchContext } from '../../../state/context/GlobalContext';
import { useRouter } from 'next/router';

const HeaderIcon = ({ Icon, name }) => {
  const router = useRouter();
  const dispatch = useContext(GlobalDispatchContext);

  const handleClickIcon = () => {
    if (name === 'Add') {
      dispatch({
        type: 'SET_IS_UPLOAD_POST_MODAL_OPEN',
        payload: {
          isUploadPostModalOpen: true,
        },
      });
    } else if (name === 'Home') {
      router.push('/');

    } else if (name === 'Profile') {
      router.push(`/my-profile`);
    } else if (name === 'Messenger') {
      router.push(`/my-messages`);
    }
  };

  return (
    <div
      onClick={handleClickIcon}
      className="p-2 text-black transition rounded cursor-pointer hover:bg-black hover:text-white"
    >
      <Icon className="" size={25} />
    </div>
  );
};

export default HeaderIcon;
