import { useState, useEffect } from 'react';
import { X, Search, Check, MapPin, Loader2 } from 'lucide-react';
import { Map, Marker } from 'pigeon-maps';

interface LocationPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLocationSelect: (location: string, locationUrl: string) => void;
    initialLocation?: string;
}

export default function LocationPickerModal({
    isOpen,
    onClose,
    onLocationSelect,
    initialLocation = ''
}: LocationPickerModalProps) {
    const [searchQuery, setSearchQuery] = useState(initialLocation);
    const [selectedLocation, setSelectedLocation] = useState('');
    // Map center state: [lat, lng]
    const [center, setCenter] = useState<[number, number]>([20.5937, 78.9629]);
    const [zoom, setZoom] = useState(5);
    // Selected point: [lat, lng]
    const [anchor, setAnchor] = useState<[number, number] | undefined>(undefined);

    const [isSearching, setIsSearching] = useState(false);

    const suggestions = [
        'Central Park, New York',
        'Gateway of India, Mumbai',
        'India Gate, New Delhi',
        'Taj Mahal, Agra',
        'Marina Beach, Chennai'
    ];

    useEffect(() => {
        if (isOpen) {
            setSearchQuery(initialLocation || '');
            setSelectedLocation('');
            setAnchor(undefined);
            // center remains default or previous
        }
    }, [isOpen, initialLocation]);

    const searchLocation = async (query: string) => {
        if (!query.trim()) return;

        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
                headers: { 'User-Agent': 'ClubConnect-App' }
            });
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon, display_name } = data[0];
                const newLat = parseFloat(lat);
                const newLng = parseFloat(lon);

                setCenter([newLat, newLng]);
                setZoom(13); // Zoom in on result
                setAnchor([newLat, newLng]);
                setSelectedLocation(display_name.split(',')[0]);
            }
        } catch (error) {
            console.error('Error searching location:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearch = () => {
        searchLocation(searchQuery);
    };

    const handleMapClick = async ({ latLng }: { latLng: [number, number] }) => {
        const [lat, lng] = latLng;
        setAnchor([lat, lng]);

        // Optional: Reverse geocode
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
                headers: { 'User-Agent': 'ClubConnect-App' }
            });
            const data = await response.json();
            if (data && data.display_name) {
                const parts = data.display_name.split(',');
                const simpleName = parts.slice(0, 2).join(', ');
                setSelectedLocation(simpleName);
                setSearchQuery(simpleName);
            } else {
                setSelectedLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
        } catch (error) {
            setSelectedLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
    };

    const handleConfirm = () => {
        if (selectedLocation && anchor) {
            const [lat, lng] = anchor;
            const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
            onLocationSelect(selectedLocation, googleMapsUrl);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl relative">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Select Location</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 shrink-0 z-10">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Search city or place..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl disabled:opacity-50 min-w-[80px] flex items-center justify-center"
                        >
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                        </button>
                    </div>
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {suggestions.map(s => (
                            <button key={s} onClick={() => { setSearchQuery(s); searchLocation(s); }} className="px-3 py-1 text-xs bg-white border rounded-full whitespace-nowrap dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600">
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pigeon Map */}
                <div className="flex-1 relative z-0 min-h-0 bg-slate-100">
                    <Map
                        height={undefined} // Let flex container handle height
                        defaultCenter={[20.5937, 78.9629]}
                        center={center}
                        zoom={zoom}
                        onBoundsChanged={({ center, zoom }) => {
                            setCenter(center);
                            setZoom(zoom);
                        }}
                        onClick={handleMapClick}
                    >
                        {anchor && <Marker anchor={anchor} color="#ef4444" width={40} />}
                    </Map>

                    {/* Confirm Button Overlay */}
                    {selectedLocation && (
                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] w-[90%] max-w-sm">
                            <button
                                onClick={handleConfirm}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                            >
                                <Check className="w-5 h-5" />
                                Confirm: {selectedLocation}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
