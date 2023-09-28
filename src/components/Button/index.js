import React from 'react'

const Button = ({
    children,
    disabled
}) => {
    return (
        <button className='w-full h-full text-center bg-[#0095F6]' disabled={disabled}>{children}</button>
    )
}

export default Button