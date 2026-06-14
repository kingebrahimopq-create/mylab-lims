import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Navigation, Map as MapIcon, Sliders, Check } from 'lucide-react';
import { Language } from '../translations';

interface InteractiveMapProps {
  lang: Language;
  currency: 'SAR' | 'EGP';
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

export default function InteractiveMap({
  lang,
  currency,
  initialLat,
  initialLng,
  onLocationSelect
}: InteractiveMapProps) {
  // Egypt Cairo is 30.0444, 31.2357; Saudi Riyadh is 24.7136, 46.6753
  const defaultLat = currency === 'EGP' ? 30.0444 : 24.7136;
  const defaultLng = currency === 'EGP' ? 31.2357 : 46.6753;

  const [lat, setLat] = useState(initialLat || defaultLat);
  const [lng, setLng] = useState(initialLng || defaultLng);
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchError, setSearchError] = useState('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null); // Leaflet Map object
  const markerRef = useRef<any>(null); // Leaflet Marker object
  const isLeafletLoaded = useRef(false);

  // Load Leaflet dynamically to avoid bundler compilation headaches
  useEffect(() => {
    // If already loaded on page, skip script injecting but re-init map
    if ((window as any).L) {
      initLeafletMap();
      return;
    }

    // Inject CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha255-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // Inject JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha255-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      isLeafletLoaded.current = true;
      initLeafletMap();
    };
    document.body.appendChild(script);

    return () => {
      // Map cleanup on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync map center on default changes
  useEffect(() => {
    if (mapRef.current && !initialLat && !initialLng) {
      const newLat = currency === 'EGP' ? 30.0444 : 24.7136;
      const newLng = currency === 'EGP' ? 31.2357 : 46.6753;
      setLat(newLat);
      setLng(newLng);
      mapRef.current.setView([newLat, newLng], 13);
      if (markerRef.current) {
        markerRef.current.setLatLng([newLat, newLng]);
      }
      reverseGeocode(newLat, newLng);
    }
  }, [currency]);

  const initLeafletMap = () => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current || mapRef.current) return;

    // Create the map focusing on Riyadh or Cairo
    mapRef.current = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 13,
      zoomControl: true,
      attributionControl: false
    });

    // Add high contrast tile layer (Streets view)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(mapRef.current);

    // Add draggable marker
    const customIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    markerRef.current = L.marker([lat, lng], {
      draggable: true,
      icon: customIcon
    }).addTo(mapRef.current);

    // Handle marker drag event
    markerRef.current.on('dragend', (e: any) => {
      const position = markerRef.current.getLatLng();
      const updatedLat = Number(position.lat.toFixed(6));
      const updatedLng = Number(position.lng.toFixed(6));
      setLat(updatedLat);
      setLng(updatedLng);
      reverseGeocode(updatedLat, updatedLng);
    });

    // Handle map click event to move marker
    mapRef.current.on('click', (e: any) => {
      const updatedLat = Number(e.latlng.lat.toFixed(6));
      const updatedLng = Number(e.latlng.lng.toFixed(6));
      setLat(updatedLat);
      setLng(updatedLng);
      if (markerRef.current) {
        markerRef.current.setLatLng([updatedLat, updatedLng]);
      }
      reverseGeocode(updatedLat, updatedLng);
    });

    // Perform initial reverse geocoding
    reverseGeocode(lat, lng);
  };

  // Safe client-side reverse geocoding via Nominatim
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${lang}`
      );
      if (response.ok) {
        const data = await response.json();
        const address = data.display_name || `${latitude}, ${longitude}`;
        setResolvedAddress(address);
        onLocationSelect(latitude, longitude, address);
      } else {
        throw new Error();
      }
    } catch {
      const fallbackAddr = `${lang === 'en' ? 'Custom Map Coordinates' : 'إحداثيات جغرافية مخصصة'}: [${latitude}, ${longitude}]`;
      setResolvedAddress(fallbackAddr);
      onLocationSelect(latitude, longitude, fallbackAddr);
    }
  };

  // Safe client-side forward search geocoding via Nominatim
  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError('');
    const L = (window as any).L;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&accept-language=${lang}`
      );
      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          const firstResult = results[0];
          const newLat = Number(parseFloat(firstResult.lat).toFixed(6));
          const newLng = Number(parseFloat(firstResult.lon).toFixed(6));
          setLat(newLat);
          setLng(newLng);
          setResolvedAddress(firstResult.display_name);

          // Update map and marker
          if (mapRef.current) {
            mapRef.current.setView([newLat, newLng], 14);
          }
          if (markerRef.current) {
            markerRef.current.setLatLng([newLat, newLng]);
          }

          onLocationSelect(newLat, newLng, firstResult.display_name);
        } else {
          setSearchError(lang === 'en' ? 'Address not found. Please pick manually on the map.' : 'لم نعثر على هذا الموقع، يرجى اختياره يدوياً بالنقر على الخريطة.');
        }
      }
    } catch (err) {
      setSearchError(lang === 'en' ? 'Search service temp unavailable.' : 'خدمة البحث معطلة مؤقتاً.');
    } finally {
      setIsSearching(false);
    }
  };

  // Detect location via browser Geolocation API
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert(lang === 'en' ? 'GPS geolocation is not supported by your browser.' : 'ميزة الـ GPS الجغرافي غير مدعومة في متصفحك الحالي.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = Number(position.coords.latitude.toFixed(6));
        const newLng = Number(position.coords.longitude.toFixed(6));
        setLat(newLat);
        setLng(newLng);

        if (mapRef.current) {
          mapRef.current.setView([newLat, newLng], 15);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        }

        reverseGeocode(newLat, newLng);
        setIsLocating(false);
      },
      (error) => {
        console.warn('GPS block:', error);
        setIsLocating(false);
        alert(lang === 'en' 
          ? 'Could not access GPS coordinates. Please select your address manually on the map.' 
          : 'تعذر الوصول لموقعك عبر GPS. يرجى سحب الدبوس وتحديد موقع منزلك يدوياً.'
        );
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  return (
    <div className="w-full space-y-3 shrink-0" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Search Input overlay */}
      <form onSubmit={handleAddressSearch} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'en' ? 'Search city, street or neighborhood...' : 'ابحث عن مدينة، شارع أو حي سكني...'}
            className="w-full border border-slate-200 rounded-xl px-4 py-2 text-xs focus:border-teal-500 outline-none transition-all pr-9 font-bold bg-white text-slate-800"
          />
          <div className={`absolute top-2.5 ${lang === 'ar' ? 'right-3' : 'left-3'} text-slate-400`}>
            <Search className="w-4 h-4 text-slate-400" />
          </div>
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <span>{isSearching ? '...' : lang === 'en' ? 'Search' : 'بحث'}</span>
        </button>

        <button
          type="button"
          onClick={handleDetectLocation}
          disabled={isLocating}
          className="bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 shrink-0 cursor-pointer"
          title={lang === 'en' ? 'Detect current location' : 'تحديد موقعي التلقائي بحرية'}
        >
          <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{lang === 'en' ? 'My GPS' : 'موقعي التلقائي'}</span>
        </button>
      </form>

      {searchError && (
        <span className="text-[10px] text-rose-500 font-bold block">{searchError}</span>
      )}

      {/* Map visual stage container */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden relative shadow-inner bg-slate-50">
        <div ref={mapContainerRef} className="w-full h-56 sm:h-64 z-0 relative" style={{ minHeight: '220px' }} />

        {/* Floating coordinates badge */}
        <div className={`absolute bottom-3 ${lang === 'ar' ? 'right-3' : 'left-3'} z-[1000] bg-slate-950/85 backdrop-blur text-white px-3 py-1.5 rounded-xl text-[9px] font-mono flex items-center gap-2 border border-slate-800 pointer-events-none`}>
          <MapPin className="w-3 h-3 text-emerald-450" />
          <span>{lat.toFixed(4)}, {lng.toFixed(4)}</span>
        </div>
      </div>

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-700">
        <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
          {lang === 'en' ? 'COMMITTED ADDRESS INFORMATION' : 'العنوان الجغرافي الملتقط:'}
        </span>
        <p className="text-xs font-bold leading-relaxed flex items-start gap-1">
          <span className="text-emerald-600 mt-0.5 font-bold">✔</span>
          <span className="text-slate-800">{resolvedAddress || (lang === 'en' ? 'Calculating...' : 'جاري جلب إحداثيات المكان...')}</span>
        </p>
      </div>
    </div>
  );
}
