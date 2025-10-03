import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/authContext'
import { doSignOut } from '../../firebase/auth'

const Header = () => {
    const navigate = useNavigate()
    const { userLoggedIn } = useAuth()
    return (
        <nav className='flex flex-row gap-x-2 w-full z-20 fixed top-0 left-0 h-12 border-b place-content-center items-center bg-gray-200'>
            {
                userLoggedIn
                    ?
                    <>
                        <button onClick={() => { doSignOut().then(() => { navigate('/login') }) }} className='text-sm text-blue-600 underline'>Logout</button>
                    </>
                    :
                    <>
                        {/* Show a button instead of a plain link so it behaves like a control */}
                        <button
                            onClick={() => navigate('/login')}
                            className='text-sm px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition'
                        >
                            Login
                        </button>
                        <Link className='text-sm text-blue-600 underline ml-2' to={'/register'}>Register New Account</Link>
                    </>
            }

        </nav>
    )
}

export default Header