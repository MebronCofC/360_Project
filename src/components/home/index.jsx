import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/authContext'
import { useNavigate } from 'react-router-dom'
import { getEvents, getPastEvents, archiveFinishedEvents } from '../../data/events'
import { getEventInventory } from '../../data/seatAssignments'
import { getEventInventoryDocFromDB } from '../../firebase/firestore'

const Home = () => {
    const { currentUser } = useAuth()
    const navigate = useNavigate()
    const [upcomingEvents, setUpcomingEvents] = useState([])
    const [currentEvents, setCurrentEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [pastEvents, setPastEvents] = useState([])
    const [lowInventoryEventIds, setLowInventoryEventIds] = useState(new Set())
    const [highDemandEventIds, setHighDemandEventIds] = useState(new Set())
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

    const scrollingImages = [
        '/cofcScrollingImage1.webp',
        '/cofcScrollingImage2.png',
        '/cofcScrollingImage3.webp',
        '/cofcScrollingImage4.jpg'
    ]

    useEffect(() => {
        const loadEvents = async () => {
            try {
                // Archive finished events and then fetch fresh lists
                await archiveFinishedEvents()
                const allEvents = await getEvents()
                const past = await getPastEvents()
                const now = new Date()
                
                // Split events into current (happening now) and upcoming (in the future)
                const current = allEvents.filter(ev => {
                    const eventStart = new Date(ev.startTime)
                    const eventEnd = ev.endTime ? new Date(ev.endTime) : new Date(eventStart.getTime() + 3 * 60 * 60 * 1000)
                    return now >= eventStart && now <= eventEnd
                })
                
                const upcoming = allEvents.filter(ev => {
                    const eventStart = new Date(ev.startTime)
                    return eventStart > now
                }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                
                setCurrentEvents(current)
                setUpcomingEvents(upcoming.slice(0, 6)) // Show max 6 upcoming
                // Fallback: include any ended items still in active collection
                const ended = allEvents.filter(ev => ev.endTime && new Date(ev.endTime) < now)
                const combined = [...past, ...ended].reduce((acc, ev) => {
                    acc.set(ev.id || ev.eventId, ev)
                    return acc
                }, new Map())
                const pastEventsList = Array.from(combined.values()).sort((a,b) => new Date(b.endTime || b.startTime) - new Date(a.endTime || a.startTime)).slice(0,6)
                setPastEvents(pastEventsList)
                // Compute low inventory flags for currently active (current + upcoming) events only
                const activeForInventory = [...current, ...upcoming];
                const lowSet = new Set();
                const highDemandSet = new Set();
                
                // High demand threshold: 2055 seats sold (14/30 sections worth)
                const HIGH_DEMAND_THRESHOLD = 2055;
                
                for (const ev of activeForInventory) {
                    try {
                        // Read from database inventory document for accurate real-time counts
                        const invDoc = await getEventInventoryDocFromDB(ev.id);
                        
                        if (invDoc) {
                            // Check total seats sold for high demand warning
                            const totalSold = invDoc.totalSeatsSold || 0;
                            if (totalSold >= HIGH_DEMAND_THRESHOLD) {
                                highDemandSet.add(ev.id);
                            }
                            
                            // Check for low inventory in individual sections
                            const sections = invDoc.sections || {};
                            let lowCount = 0;
                            for (const [secId, secData] of Object.entries(sections)) {
                                const total = secData.total || 0;
                                const taken = secData.taken || 0;
                                const remaining = total - taken;
                                const ratio = total > 0 ? remaining / total : 1;
                                if (ratio <= 0.35 && remaining > 0) {
                                    lowCount++;
                                }
                            }
                            if (lowCount >= 2) {
                                lowSet.add(ev.id);
                            }
                        } else {
                            // Fallback to computed inventory if doc doesn't exist yet
                            const inventory = await getEventInventory(ev.id);
                            if (inventory.lowInventorySections >= 2) {
                                lowSet.add(ev.id);
                            }
                            // Fallback: use soldOut sections count
                            if (inventory.soldOutSections && inventory.soldOutSections.length >= 14) {
                                highDemandSet.add(ev.id);
                            }
                        }
                    } catch (e) {
                        console.warn('Inventory check failed for event', ev.id, e);
                    }
                }
                setLowInventoryEventIds(lowSet)
                setHighDemandEventIds(highDemandSet)
            } catch (error) {
                console.error('Error loading events:', error)
            } finally {
                setLoading(false)
            }
        }
        loadEvents()
    }, [])

    // Auto-scroll carousel effect
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prevIndex) => (prevIndex + 1) % scrollingImages.length)
        }, 4000) // Change image every 4 seconds

        return () => clearInterval(interval)
    }, [scrollingImages.length])

    const handleEventClick = (eventId) => {
        navigate(`/events/${eventId}`)
    }

    if (loading) {
        return <div className="p-6 mt-12 text-center">Loading events...</div>
    }

    return (
         <div className="max-w-7xl mx-auto p-6 mt-12">
            {currentUser && (
                <p className="text-lg mb-8 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 inline-block shadow-md">
                    Hello, {currentUser.displayName || currentUser.email}!
                </p>
            )}

            {/* Main white backdrop containing everything */}
            <div className="bg-white/95 backdrop-blur-sm border border-gray-300 rounded-2xl p-6 shadow-lg">
                <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
                    <img
                        src="/cougarCourtsideLOGO.png"
                        alt="Cougar Courtside Logo"
                        className="h-40 md:h-44 w-auto shrink-0 drop-shadow-lg border-2 border-gray-800 rounded"
                    />
                    <span>Welcome to Cougar Courtside</span>
                    <img
                        src="/CofC_Logo.png"
                        alt="College of Charleston Logo"
                        className="h-40 md:h-44 w-auto shrink-0 drop-shadow-lg border-2 border-gray-800 rounded"
                    />
                </h1>

                {/* Auto-scrolling Image Carousel */}
                <div className="mb-8 border border-gray-300 rounded-2xl overflow-hidden shadow-md">
                    <div className="relative h-64 md:h-96">
                        {scrollingImages.map((image, index) => (
                            <img
                                key={index}
                                src={image}
                                alt={`College of Charleston ${index + 1}`}
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                                    index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                                }`}
                            />
                        ))}
                        {/* Carousel indicators */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                            {scrollingImages.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentImageIndex(index)}
                                    className={`w-3 h-3 rounded-full transition-all ${
                                        index === currentImageIndex ? 'bg-white w-8' : 'bg-white/50'
                                    }`}
                                    aria-label={`Go to image ${index + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

            {/* Current Events Section */}
            <section className="mb-12">
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
                                    <h3 className="text-xl font-bold mb-2 text-gray-900 flex items-center justify-between">
                                        <span>{ev.title}</span>
                                        {highDemandEventIds.has(ev.id) ? (
                                            <span className="ml-2 text-xs font-semibold bg-orange-600 text-white px-2 py-1 rounded-lg animate-pulse" title="14+ sections sold out">
                                                Get your tickets soon! Seats are running out fast!
                                            </span>
                                        ) : lowInventoryEventIds.has(ev.id) ? (
                                            <span className="ml-2 text-xs font-semibold bg-red-600 text-white px-2 py-1 rounded-lg animate-pulse" title="Multiple sections running low">
                                                Seats Low!
                                            </span>
                                        ) : null}
                                    </h3>
                                    {ev.description && (
                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ev.description}</p>
                                    )}
                                    <div className="text-sm text-gray-500 mb-2">
                                        📍 {ev.venueId || 'TD Arena'}
                                    </div>
                                    <div className="text-sm text-gray-700 font-semibold">
                                        {new Date(ev.startTime).toLocaleTimeString()} - {ev.endTime ? new Date(ev.endTime).toLocaleTimeString() : 'TBD'}
                                    </div>
                                    <div className="mt-4 text-lg font-bold text-purple-600">
                                        ${ev.basePrice}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500 mt-4 border border-gray-200">
                            No live games at the moment
                        </div>
                    )}
            </section>

            {/* Upcoming Events Section */}
            <section>
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
                                    <h3 className="text-xl font-bold mb-2 text-gray-900 flex items-center justify-between">
                                        <span>{ev.title}</span>
                                        {highDemandEventIds.has(ev.id) ? (
                                            <span className="ml-2 text-xs font-semibold bg-orange-600 text-white px-2 py-1 rounded-lg animate-pulse" title="14+ sections sold out">
                                                Get your tickets soon! Seats are running out fast!
                                            </span>
                                        ) : lowInventoryEventIds.has(ev.id) ? (
                                            <span className="ml-2 text-xs font-semibold bg-red-600 text-white px-2 py-1 rounded-lg animate-pulse" title="Multiple sections running low">
                                                Seats Low!
                                            </span>
                                        ) : null}
                                    </h3>
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
                                        🕐 {new Date(ev.startTime).toLocaleTimeString()} - {ev.endTime ? new Date(ev.endTime).toLocaleTimeString() : 'TBD'}
                                    </div>
                                    <div className="mt-4 text-lg font-bold text-purple-600">
                                        ${ev.basePrice}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500 mt-4 border border-gray-200">
                            No upcoming events at this time. Check back soon!
                        </div>
                    )}
            </section>

            {/* Past Events Section */}
            <section className="mt-12">
                    <h2 className="text-2xl font-semibold mb-4 bg-gray-700 text-white rounded-lg px-6 py-3 inline-block">
                        🕓 Recent Past Events
                    </h2>
                    {pastEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pastEvents.map(ev => (
                                <div
                                    key={ev.id}
                                    className="bg-white border border-gray-300 rounded-xl p-6 shadow-md"
                                >
                                    <h3 className="text-xl font-bold mb-2 text-gray-900">{ev.title}</h3>
                                    {ev.description && (
                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{ev.description}</p>
                                    )}
                                    <div className="text-sm text-gray-500 mb-2">
                                        📍 {ev.venueId || 'TD Arena'}
                                    </div>
                                    <div className="text-xs text-gray-500 italic mb-2">Ended: {ev.endTime ? new Date(ev.endTime).toLocaleString() : 'Unknown'}</div>
                                    <div className="text-sm text-gray-700 mb-1">
                                        📆 {new Date(ev.startTime).toLocaleDateString()}
                                    </div>
                                    <div className="text-sm text-gray-700 font-semibold mb-3">
                                        🕐 {new Date(ev.startTime).toLocaleTimeString()} - {ev.endTime ? new Date(ev.endTime).toLocaleTimeString() : 'TBD'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500 mt-4 border border-gray-200">
                            No past events archived yet.
                        </div>
                    )}
            </section>

            </div>
            {/* End of main white backdrop */}

            {currentEvents.length === 0 && upcomingEvents.length === 0 && (
                <div className="bg-white/95 backdrop-blur-sm rounded-lg p-12 text-center mt-8 shadow-lg border border-gray-300">
                    <p className="text-xl text-gray-600 mb-4">No events scheduled at TD Arena right now.</p>
                    <p className="text-gray-500">Check back later for exciting upcoming events!</p>
                </div>
            )}
        </div>
    )
}

export default Home
