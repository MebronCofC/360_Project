import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/authContext'
import { doSignOut } from '../../firebase/auth'

const Header = () => {
    const navigate = useNavigate()
    const { userLoggedIn, currentUser } = useAuth() || { userLoggedIn: false, currentUser: null };
    
  const handleLogout = async () => {
    try {
      await doSignOut();
      navigate("/login");
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };
    return (
    <nav className="fixed top-0 left-0 z-20 h-12 w-full border-b bg-gray-200">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        {/* Brand + explicit Home link */}
        <div className="flex items-center gap-x-3">
          <Link to="/" className="text-sm font-semibold text-red-900 hover:text-red-800">
            Cougar Courtside
          </Link>
          <Link to="/" className="text-sm font-semibold text-black hover:text-gray-800">
            Home
          </Link>
        </div>

        {/* Primary nav (aligns with your diagrams / use cases) */}
        <div className="flex items-center gap-x-4">
          <Link to="/events" className="text-sm hover:text-indigo-700">
            Events
          </Link>
          <Link to="/my-tickets" className="text-sm hover:text-indigo-700">
            My Tickets
          </Link>

          {userLoggedIn ? (
            <>
              {currentUser?.email && (
                <span className="hidden sm:inline text-xs text-gray-600">
                  {currentUser.email}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="rounded-md bg-red-600 px-3 py-1 text-sm text-white transition hover:bg-red-700"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/login")}
                className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white transition hover:bg-indigo-700"
              >
                Login
              </button>
              <Link
                to="/register"
                className="text-sm text-blue-600 underline hover:text-blue-700"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Header
