import React from 'react';
import Lottie from 'react-lottie-player';
import LoadingAnimation from '../../../public/assets/animations/loading-animation.json'

const LoadingOverLay = () => {
    return (
        <div className='absolute inset-0 w-full h-full bg-black bg-opacity-10 flex items-center justify-center z-10'>
            <Lottie
                className='w-1/2'
                play
                loop
                animationData={LoadingAnimation}
            />
        </div>
    )
}

export default LoadingOverLay