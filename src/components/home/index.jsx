import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/authContext'
import { useNavigate } from 'react-router-dom'
import { getEvents } from '../../data/events'

const Home = () => {
    const { currentUser } = useAuth()
    const navigate = useNavigate()
    const [upcomingEvents, setUpcomingEvents] = useState([])
    const [currentEvents, setCurrentEvents] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadEvents = async () => {
            try {
                const allEvents = await getEvents()
                const now = new Date()
                
                // Split events into current (happening now) and upcoming (in the future)
                const current = allEvents.filter(ev => {
                    const eventStart = new Date(ev.startTime)
                    const eventEnd = new Date(eventStart.getTime() + 3 * 60 * 60 * 1000) // Assume 3 hour duration
                    return now >= eventStart && now <= eventEnd
                })
                
                const upcoming = allEvents.filter(ev => {
                    const eventStart = new Date(ev.startTime)
                    return eventStart > now
                }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                
                setCurrentEvents(current)
                setUpcomingEvents(upcoming.slice(0, 6)) // Show max 6 upcoming
            } catch (error) {
                console.error('Error loading events:', error)
            } finally {
                setLoading(false)
            }
        }
        loadEvents()
    }, [])

    const handleEventClick = (eventId) => {
        navigate(`/events/${eventId}`)
    }

    if (loading) {
        return <div className="p-6 mt-12 text-center">Loading events...</div>
    }

    return (
        <div className="max-w-7xl mx-auto p-6 mt-12">
            <h1 className="text-3xl font-bold mb-8 bg-white border border-gray-300 rounded-lg px-6 py-4 shadow-sm">
                Welcome to Cougar Courtside
            </h1>
            
            {currentUser && (
                <p className="text-lg mb-8 bg-white/90 rounded-lg px-4 py-2 inline-block">
                    Hello, {currentUser.displayName || currentUser.email}!
                </p>
            )}

            {/* Current Events Section */}
            <section className="mb-12">
                <div className="bg-white/90 border border-gray-300 rounded-2xl p-5 shadow-sm">
                    <h2 className="text-2xl font-semibold mb-4 bg-green-600 text-white rounded-lg px-6 py-3 inline-block">
                        🔴 Live Now at TD Arena
                    </h2>
                    {currentEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {currentEvents.map(ev => (
                                <div
                                    key={ev.id}
                                    onClick={() => handleEventClick(ev.id)}
                                    className="bg-white border-4 border-green-500 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:scale-105"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
                                        <span className="text-sm font-bold text-green-700 uppercase">Live Now</span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 text-gray-900">{ev.title}</h3>
                                    {ev.description && (
                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ev.description}</p>
                                    )}
                                    <div className="text-sm text-gray-500 mb-2">
                                        📍 {ev.venueId || 'TD Arena'}
                                    </div>
                                    <div className="text-sm text-gray-700 font-semibold">
                                        Started: {new Date(ev.startTime).toLocaleTimeString()}
                                    </div>
                                    <div className="mt-4 text-lg font-bold text-purple-600">
                                        ${ev.basePrice}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg p-8 text-center text-gray-500 mt-4">
                            No live games at the moment
                        </div>
                    )}
                </div>
            </section>

            {/* Upcoming Events Section */}
            <section>
                <div className="bg-white/90 border border-gray-300 rounded-2xl p-5 shadow-sm">
                    <h2 className="text-2xl font-semibold mb-4 bg-purple-600 text-white rounded-lg px-6 py-3 inline-block">
                        📅 Upcoming Events
                    </h2>
                    {upcomingEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {upcomingEvents.map(ev => (
                                <div
                                    key={ev.id}
                                    onClick={() => handleEventClick(ev.id)}
                                    className="bg-white border border-gray-300 rounded-xl p-6 shadow-md hover:shadow-xl transition-all cursor-pointer transform hover:scale-105 hover:border-purple-500"
                                >
                                    <h3 className="text-xl font-bold mb-2 text-gray-900">{ev.title}</h3>
                                    {ev.description && (
                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ev.description}</p>
                                    )}
                                    <div className="text-sm text-gray-500 mb-2">
                                        📍 {ev.venueId || 'TD Arena'}
                                    </div>
                                    <div className="text-sm text-gray-700 mb-1">
                                        📆 {new Date(ev.startTime).toLocaleDateString()}
                                    </div>
                                    <div className="text-sm text-gray-700 font-semibold mb-3">
                                        🕐 {new Date(ev.startTime).toLocaleTimeString()}
                                    </div>
                                    <div className="mt-4 text-lg font-bold text-purple-600">
                                        ${ev.basePrice}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg p-8 text-center text-gray-500 mt-4">
                            No upcoming events at this time. Check back soon!
                        </div>
                    )}
                </div>
            </section>

            {currentEvents.length === 0 && upcomingEvents.length === 0 && (
                <div className="bg-white rounded-lg p-12 text-center mt-8">
                    <p className="text-xl text-gray-600 mb-4">No events scheduled at TD Arena right now.</p>
                    <p className="text-gray-500">Check back later for exciting upcoming events!</p>
                </div>
            )}
        </div>
    )
}

export default Home
