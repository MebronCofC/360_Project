import React from 'react'
import { useAuth } from '../../contexts/authContext'
   import { useNavigate } from 'react-router-dom'
   import { doSignOut } from '../../firebase/auth'

const Home = () => {
        const { currentUser, logout, userLoggedIn } = useAuth()   // userLoggedIn indicates auth state
        const navigate = useNavigate()
    return (
        <div className="flex flex-col items-center pt-20 mt-12 font-sans">
            <h2 className="text-2xl font-bold mb-6">Select your seats</h2>

            <div className='text-2xl font-bold'>
                Hello {currentUser?.displayName ? currentUser.displayName : currentUser?.email}, you are now logged in.
            </div>

                {/* Seating chart image - show only when user is logged in. The file is in public/ */}
                {(userLoggedIn || currentUser) && (
                    <div className='mt-6 max-w-4xl w-full'>
                        <img
                            src="/COFC_TD_ARENA_SeatingChart.webp"
                            alt="Seating chart"
                            className="w-full h-auto rounded-md border-2 border-gray-800"
                            style={{ maxWidth: '100%' }}
                        />
                    </div>
                )}

            {/* Logout button */}
                <button
                    onClick={async () => {
                        try {
                            if (typeof logout === 'function') {
                                await logout()
                            } else {
                                await doSignOut()
                            }
                            navigate('/login')
                        } catch (err) {
                            console.error('Logout failed', err)
                        }
                    }}
                className="mt-6 px-6 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 transition"
            >
                Logout
            </button>
        </div>
    )
}

export default Home
