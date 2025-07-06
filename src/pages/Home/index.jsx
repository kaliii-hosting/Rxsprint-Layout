import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactDOMServer from 'react-dom/server';
import { 
  Home as HomeIcon, 
  Calculator, 
  Pill, 
  Calendar, 
  GitBranch,
  Package,
  ShoppingCart,
  StickyNote,
  ScanLine,
  Bookmark,
  Bot,
  Zap,
  Globe,
  ExternalLink,
  FileText
} from 'lucide-react';
import CurlinPumpIcon from '../../components/icons/CurlinPumpIcon';
import { db, auth } from '../../config/firebase';
import { collection, onSnapshot, query, where, doc, setDoc, updateDoc } from 'firebase/firestore';
import './Home.css';

// Location data with all 13 app sections
const locations = [
  {
    name: 'Home',
    icon: HomeIcon,
    class: 'marker-home',
    coords: [29.5523, -95.1356],
    path: '/'
  },
  {
    name: 'Shop',
    icon: ShoppingCart,
    class: 'marker-shop',
    coords: [29.5123, -95.1056],
    path: '/shop'
  },
  {
    name: 'Pump',
    icon: CurlinPumpIcon,
    class: 'marker-pump',
    coords: [29.5923, -95.1756],
    path: '/pump'
  },
  {
    name: 'Medications',
    icon: Pill,
    class: 'marker-medications',
    coords: [29.5323, -95.0856],
    path: '/medications'
  },
  {
    name: 'Calculator',
    icon: Calculator,
    class: 'marker-calculator',
    coords: [29.5423, -95.1856],
    path: '/calculator'
  },
  {
    name: 'Note Generator',
    icon: Zap,
    class: 'marker-note-generator',
    coords: [29.5823, -95.1256],
    path: '/note-generator'
  },
  {
    name: 'Analyzer',
    icon: ScanLine,
    class: 'marker-analyzer',
    coords: [29.5623, -95.1156],
    path: '/analyzer'
  },
  {
    name: 'Bookmarks',
    icon: Bookmark,
    class: 'marker-bookmarks',
    coords: [29.5723, -95.1556],
    path: '/bookmark-manager'
  },
  {
    name: 'Calendar',
    icon: Calendar,
    class: 'marker-calendar',
    coords: [29.5223, -95.1956],
    path: '/calendar'
  },
  {
    name: 'Notes',
    icon: StickyNote,
    class: 'marker-notes',
    coords: [29.5023, -95.1456],
    path: '/notes'
  },
  {
    name: 'Supplies',
    icon: Package,
    class: 'marker-supplies',
    coords: [29.5423, -95.0956],
    path: '/supplies'
  },
  {
    name: 'Workflow',
    icon: GitBranch,
    class: 'marker-workflow',
    coords: [29.5123, -95.1656],
    path: '/workflow'
  },
  {
    name: 'GPT',
    icon: Bot,
    class: 'marker-gpt',
    coords: [29.5623, -95.1856],
    path: '/gpt'
  }
];

// African locations - spread across the entire continent
const africanLocations = [
  { lat: -33.9249, lng: 18.4241 }, // Cape Town, South Africa (South)
  { lat: 30.0444, lng: 31.2357 }, // Cairo, Egypt (North)
  { lat: -1.2921, lng: 36.8219 }, // Nairobi, Kenya (East)
  { lat: 6.5244, lng: 3.3792 }, // Lagos, Nigeria (West)
  { lat: -26.2041, lng: 28.0473 }, // Johannesburg, South Africa (South-East)
  { lat: 33.5731, lng: -7.5898 }, // Casablanca, Morocco (North-West)
  { lat: 9.0240, lng: 38.7469 }, // Addis Ababa, Ethiopia (East)
  { lat: 0.3476, lng: 32.5825 }, // Kampala, Uganda (Central-East)
  { lat: -15.4167, lng: 28.2833 }, // Lusaka, Zambia (South-Central)
  { lat: -4.0435, lng: 39.6682 }, // Mombasa, Kenya (East Coast)
  { lat: 36.8065, lng: 10.1815 }, // Tunis, Tunisia (North)
  { lat: -17.8292, lng: 31.0522 }, // Harare, Zimbabwe (South-East)
  { lat: 5.5600, lng: -0.1969 }, // Accra, Ghana (West)
  { lat: -6.1659, lng: 39.2026 }, // Dar es Salaam, Tanzania (East)
  { lat: 12.6392, lng: -8.0029 }, // Bamako, Mali (West)
  { lat: 15.3369, lng: 44.2061 }, // Sana'a, Yemen (North-East)
  { lat: -8.8383, lng: 13.2344 }, // Luanda, Angola (West)
  { lat: 32.8872, lng: 13.1913 }, // Tripoli, Libya (North)
  { lat: -29.3167, lng: 27.4833 }, // Maseru, Lesotho (South)
  { lat: 3.8667, lng: 11.5167 }, // Yaoundé, Cameroon (Central-West)
  { lat: -18.8792, lng: 47.5079 }, // Antananarivo, Madagascar (East)
  { lat: 24.6541, lng: 46.7152 }, // Riyadh Region (North-East)
  { lat: -22.5597, lng: 17.0832 }, // Windhoek, Namibia (South-West)
  { lat: 11.8619, lng: 15.0506 }, // N'Djamena, Chad (Central)
  { lat: -11.6876, lng: 27.8493 }, // Lubumbashi, DRC (Central-South)
  { lat: 36.7372, lng: 3.0863 }, // Algiers, Algeria (North)
  { lat: -20.1639, lng: 28.5833 }, // Bulawayo, Zimbabwe (South)
  { lat: 18.0731, lng: -15.9582 }, // Nouakchott, Mauritania (West)
  { lat: -4.2634, lng: 15.2832 }, // Kinshasa, DRC (Central-West)
  { lat: 9.1450, lng: 40.4897 }, // Harar, Ethiopia (East)
];

// Asian locations - spread across the entire continent
const asianLocations = [
  { lat: 35.6762, lng: 139.6503 }, // Tokyo, Japan (East)
  { lat: 39.9042, lng: 116.4074 }, // Beijing, China (North-East)
  { lat: 31.2304, lng: 121.4737 }, // Shanghai, China (East)
  { lat: 28.6139, lng: 77.2090 }, // New Delhi, India (South-Central)
  { lat: 19.0760, lng: 72.8777 }, // Mumbai, India (South-West)
  { lat: 13.7563, lng: 100.5018 }, // Bangkok, Thailand (South-East)
  { lat: 1.3521, lng: 103.8198 }, // Singapore (South-East)
  { lat: 37.5665, lng: 126.9780 }, // Seoul, South Korea (North-East)
  { lat: 22.3193, lng: 114.1694 }, // Hong Kong (South-East)
  { lat: -6.2088, lng: 106.8456 }, // Jakarta, Indonesia (South-East)
  { lat: 25.0330, lng: 121.5654 }, // Taipei, Taiwan (East)
  { lat: 14.5995, lng: 120.9842 }, // Manila, Philippines (South-East)
  { lat: 3.1390, lng: 101.6869 }, // Kuala Lumpur, Malaysia (South-East)
  { lat: 21.0285, lng: 105.8542 }, // Hanoi, Vietnam (South-East)
  { lat: 23.8103, lng: 90.4125 }, // Dhaka, Bangladesh (South)
  { lat: 12.9716, lng: 77.5946 }, // Bangalore, India (South)
  { lat: 41.0082, lng: 28.9784 }, // Istanbul, Turkey (West)
  { lat: 24.7136, lng: 46.6753 }, // Riyadh, Saudi Arabia (West)
  { lat: 25.2760, lng: 55.2962 }, // Dubai, UAE (West)
  { lat: 35.6892, lng: 51.3890 }, // Tehran, Iran (West)
  { lat: 43.2551, lng: 76.9126 }, // Almaty, Kazakhstan (Central)
  { lat: 41.2995, lng: 69.2401 }, // Tashkent, Uzbekistan (Central)
  { lat: 56.8389, lng: 60.6057 }, // Yekaterinburg, Russia (North)
  { lat: 55.7558, lng: 37.6173 }, // Moscow, Russia (North-West)
  { lat: 43.8688, lng: 125.3226 }, // Changchun, China (North-East)
  { lat: 22.5431, lng: 88.3179 }, // Kolkata, India (East)
  { lat: 17.3850, lng: 78.4867 }, // Hyderabad, India (South-Central)
  { lat: 13.0827, lng: 80.2707 }, // Chennai, India (South-East)
  { lat: 31.5204, lng: 74.3587 }, // Lahore, Pakistan (Central)
  { lat: 24.8607, lng: 67.0011 }, // Karachi, Pakistan (South-West)
  { lat: 34.5553, lng: 69.2075 }, // Kabul, Afghanistan (Central-West)
  { lat: 47.9105, lng: 106.9057 }, // Ulaanbaatar, Mongolia (North)
  { lat: 27.7172, lng: 85.3240 }, // Kathmandu, Nepal (South-Central)
  { lat: 6.9271, lng: 79.8612 }, // Colombo, Sri Lanka (South)
  { lat: 16.8409, lng: 96.1735 }, // Yangon, Myanmar (South-East)
  { lat: 11.5564, lng: 104.9282 }, // Phnom Penh, Cambodia (South-East)
  { lat: 17.9757, lng: 102.6331 }, // Vientiane, Laos (South-East)
  { lat: 4.2105, lng: 101.9758 }, // Cyberjaya, Malaysia (South-East)
  { lat: -0.7893, lng: 113.9213 }, // Palangkaraya, Indonesia (South-East)
  { lat: 7.8731, lng: 125.7275 }, // Davao, Philippines (South-East)
];

const Home = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const bookmarkMarkersRef = useRef([]);
  const noteMarkersRef = useRef([]);
  const pageMarkersRef = useRef([]);
  const initializingRef = useRef(false);
  const [customPositions, setCustomPositions] = useState({});
  const isDraggingRef = useRef(false);

  // Function to save marker position to Firebase
  const saveMarkerPosition = async (markerId, type, lat, lng) => {
    if (!db) return;
    
    try {
      const userId = auth?.currentUser?.uid || 'anonymous';
      const positionDoc = doc(db, 'markerPositions', `${userId}_${type}_${markerId}`);
      await setDoc(positionDoc, {
        markerId,
        type,
        lat,
        lng,
        userId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`Saved position for ${type}_${markerId}:`, { lat, lng });
    } catch (error) {
      console.error('Error saving marker position:', error);
    }
  };

  // Subscribe to custom positions from Firebase
  useEffect(() => {
    if (!db) return;

    const userId = auth?.currentUser?.uid || 'anonymous';
    const positionsRef = collection(db, 'markerPositions');
    const q = query(positionsRef, where('userId', '==', userId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const positions = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Store with simplified key for easier lookup
        const key = `${data.type}_${data.markerId}`;
        positions[key] = data;
      });
      setCustomPositions(positions);
      console.log('Loaded custom positions:', positions);
    });

    return () => unsubscribe();
  }, []);

  // Initialize map - only run once
  useEffect(() => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    let themeObserver;
    let handleResize;

    const loadLeafletAssets = async () => {
      // Load Leaflet CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const leafletCSS = document.createElement('link');
        leafletCSS.rel = 'stylesheet';
        leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(leafletCSS);
      }

      // Load Leaflet JS
      if (!window.L) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }
    };

    const initializeMap = async () => {
      try {
        await loadLeafletAssets();

        // Wait for map container
        if (!mapRef.current) {
          console.error('Map container not available');
          return;
        }

        // Skip if already initialized
        if (mapInstanceRef.current) {
          return;
        }

        // Check if mobile
        const isMobile = window.innerWidth <= 768;
        
        // Initialize the map with mobile-friendly settings
        const map = window.L.map(mapRef.current, {
          center: [20.0, 0.0], // Center of world
          zoom: isMobile ? 1.5 : 2, // Better initial zoom for mobile
          zoomControl: true,
          minZoom: isMobile ? 1.5 : 1, // Prevent too much zoom-out on mobile
          maxZoom: 18,
          attributionControl: false,
          maxBoundsViscosity: 1.0,
          worldCopyJump: true,
          // Set max bounds to prevent too much panning
          maxBounds: [[-90, -180], [90, 180]]
        });
        
        mapInstanceRef.current = map;

        // Add theme-appropriate tiles
        const isDarkTheme = document.documentElement.getAttribute('data-theme') !== 'light';
        const tileUrl = isDarkTheme 
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
        
        window.L.tileLayer(tileUrl, {
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);

        // Store map instance for page markers
        window.pageMarkersMap = map;
        window.pageMarkersNavigate = navigate;

        // Add a circle around home
        window.L.circle([29.5523, -95.1356], {
          color: '#2196F3',
          fillColor: '#2196F3',
          fillOpacity: 0.1,
          radius: 2000,
          weight: 1
        }).addTo(map);

        // Handle window resize
        handleResize = () => {
          map.invalidateSize();
        };
        window.addEventListener('resize', handleResize);
        
        // Listen for theme changes
        themeObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
              const isDarkTheme = document.documentElement.getAttribute('data-theme') !== 'light';
              const newTileUrl = isDarkTheme 
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
              
              map.eachLayer((layer) => {
                if (layer instanceof window.L.TileLayer) {
                  map.removeLayer(layer);
                }
              });
              
              window.L.tileLayer(newTileUrl, {
                subdomains: 'abcd',
                maxZoom: 20
              }).addTo(map);
            }
          });
        });
        
        themeObserver.observe(document.documentElement, { attributes: true });

        // Handle zoom-based marker sizing and prevent dead spaces
        map.on('zoomend', () => {
          const zoom = map.getZoom();
          const markers = document.querySelectorAll('.location-marker');
          
          // Marker scaling
          markers.forEach(marker => {
            const isSmall = marker.classList.contains('location-marker-small');
            if (zoom < 3) {
              marker.style.transform = isSmall ? 'scale(0.8)' : 'scale(0.7)';
            } else if (zoom < 4) {
              marker.style.transform = isSmall ? 'scale(0.9)' : 'scale(0.85)';
            } else {
              marker.style.transform = 'scale(1)';
            }
          });
          
          // Prevent dead spaces on mobile by ensuring minimum zoom
          if (isMobile && zoom < 1.5) {
            map.setZoom(1.5, { animate: false });
          }
        });
        
        // Also handle zoom start to prevent zoom-out beyond limits
        map.on('zoomstart', () => {
          const currentZoom = map.getZoom();
          if (isMobile && currentZoom <= 1.5) {
            // Prevent zoom out if already at minimum
            map.off('zoomend');
          }
        });

        // Add continent view buttons for mobile
        if (isMobile) {
          // Create buttons outside of Leaflet's control system for proper centering
          const continentContainer = document.createElement('div');
          continentContainer.className = 'continent-controls';
          continentContainer.innerHTML = `
            <div class="continent-buttons">
              <button class="continent-btn" data-continent="north-america">Pages</button>
              <button class="continent-btn" data-continent="africa">Bookmarks</button>
              <button class="continent-btn" data-continent="asia">Notes</button>
              <button class="continent-btn" data-continent="world">World</button>
            </div>
          `;
          
          // Force white text color for light theme using JavaScript
          const applyLightThemeStyles = () => {
            const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
            if (isLightTheme) {
              const buttons = continentContainer.querySelectorAll('.continent-btn');
              buttons.forEach(button => {
                button.style.color = 'white !important';
                button.style.backgroundColor = '#ff5400';
                button.style.borderColor = '#ff5400';
                button.style.setProperty('color', 'white', 'important');
              });
            }
          };
          
          // Apply styles initially
          applyLightThemeStyles();
          
          // Watch for theme changes
          const themeObserverForButtons = new MutationObserver(applyLightThemeStyles);
          themeObserverForButtons.observe(document.documentElement, { 
            attributes: true, 
            attributeFilter: ['data-theme'] 
          });
          
          // Add hover event handlers for light theme
          continentContainer.addEventListener('mouseenter', (e) => {
            if (e.target.classList.contains('continent-btn')) {
              const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
              if (isLightTheme) {
                e.target.style.backgroundColor = '#666666';
                e.target.style.borderColor = '#666666';
                e.target.style.color = 'white';
                e.target.style.setProperty('color', 'white', 'important');
              }
            }
          }, true);
          
          continentContainer.addEventListener('mouseleave', (e) => {
            if (e.target.classList.contains('continent-btn')) {
              const isLightTheme = document.documentElement.getAttribute('data-theme') === 'light';
              if (isLightTheme) {
                e.target.style.backgroundColor = '#ff5400';
                e.target.style.borderColor = '#ff5400';
                e.target.style.color = 'white';
                e.target.style.setProperty('color', 'white', 'important');
              }
            }
          }, true);
          
          // Add click handlers
          continentContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('continent-btn')) {
              const continent = e.target.dataset.continent;
              switch(continent) {
                case 'north-america':
                  map.setView([45.0, -100.0], 3, { animate: true });
                  break;
                case 'africa':
                  map.setView([-2.0, 20.0], 2.8, { animate: true });
                  break;
                case 'asia':
                  map.setView([30.0, 90.0], 2.5, { animate: true });
                  break;
                case 'world':
                  // Calculate appropriate zoom to fill mobile viewport without dead spaces
                  const viewportHeight = window.innerHeight;
                  const viewportWidth = window.innerWidth;
                  const aspectRatio = viewportWidth / viewportHeight;
                  
                  // Ensure minimum zoom to prevent dead spaces on mobile
                  let worldZoom;
                  if (window.innerWidth <= 768) {
                    // Mobile: never go below 1.5 to prevent dead spaces
                    worldZoom = Math.max(1.5, aspectRatio < 1 ? 1.7 : 1.5);
                  } else {
                    // Desktop: can use lower zoom
                    worldZoom = aspectRatio < 1 ? 1.5 : 1;
                  }
                  map.setView([0.0, 0.0], worldZoom, { animate: true });
                  break;
              }
            }
          });
          
          // Append to the map container (parent of the map)
          mapRef.current.parentElement.appendChild(continentContainer);
        }
        
        // Set map as ready
        setMapReady(true);
        console.log('Map ready');

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    // Start initialization
    initializeMap();

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (e) {
          console.error('Error removing map:', e);
        }
      }
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      if (themeObserver) {
        themeObserver.disconnect();
      }
    };
  }, []); // Empty dependency array - only run once

  // Add page markers to map
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.L) {
      return;
    }

    // Remove existing page markers
    if (pageMarkersRef.current) {
      pageMarkersRef.current.forEach(marker => {
        try {
          mapInstanceRef.current.removeLayer(marker);
        } catch (e) {}
      });
      pageMarkersRef.current = [];
    }

    // Create markers for each location
    locations.forEach((location, index) => {
      const Icon = location.icon;
      const iconHtml = ReactDOMServer.renderToStaticMarkup(
        <Icon size={10} />
      );

      const markerHtml = `
        <div class="location-marker location-marker-small ${location.class}">
          <div class="marker-icon-wrapper">
            ${iconHtml}
          </div>
          <div class="marker-title marker-title-small">
            ${location.name}
          </div>
        </div>
      `;

      const customIcon = window.L.divIcon({
        className: 'custom-marker-wrapper',
        html: markerHtml,
        iconSize: [31, 39],
        iconAnchor: [16, 31],
        popupAnchor: [0, -31]
      });

      // Check if there's a custom position for this page
      const customPosKey = `page_${location.name}`;
      const customPos = customPositions[customPosKey];
      const markerCoords = customPos ? [customPos.lat, customPos.lng] : location.coords;

      const marker = window.L.marker(markerCoords, { 
        icon: customIcon,
        riseOnHover: true,
        draggable: true
      });

      marker.on('click', () => {
        if (!isDraggingRef.current) {
          navigate(location.path);
        }
      });

      marker.on('dragstart', () => {
        isDraggingRef.current = true;
      });

      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        saveMarkerPosition(location.name, 'page', lat, lng);
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 100);
      });

      marker.addTo(mapInstanceRef.current);
      pageMarkersRef.current.push(marker);
    });
  }, [mapReady, customPositions, navigate]);

  // Subscribe to bookmarks from Firebase
  useEffect(() => {
    if (!db) {
      console.error('Firestore database is not initialized');
      // Set test bookmarks as fallback
      const testBookmarks = [
        {
          id: 'test1',
          title: 'Cairo Bookmark',
          url: 'https://google.com',
          color: '#FF006E',
          userId: 'default-user'
        },
        {
          id: 'test2',
          title: 'Lagos Bookmark',
          url: 'https://github.com',
          color: '#3A86FF',
          userId: 'default-user'
        }
      ];
      setBookmarks(testBookmarks);
      return;
    }
    
    console.log('Setting up bookmarks subscription...');
    
    try {
      const bookmarksRef = collection(db, 'bookmarks');
      
      const unsubscribe = onSnapshot(
        bookmarksRef,
        (snapshot) => {
          console.log('Bookmarks snapshot received:', snapshot.size, 'documents');
          
          const bookmarksData = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Bookmark document:', doc.id, data);
            bookmarksData.push({
              id: doc.id,
              ...data
            });
          });
          
          // Use all bookmarks (no userId filtering needed)
          console.log('Total bookmarks found:', bookmarksData.length);
          
          // Use real bookmarks if available, otherwise use test bookmarks
          if (bookmarksData.length > 0) {
            setBookmarks(bookmarksData);
          } else {
            console.log('No user bookmarks found, using test bookmarks');
            const testBookmarks = [
              {
                id: 'test1',
                title: 'Cairo Bookmark',
                url: 'https://google.com',
                color: '#FF006E',
                userId: 'default-user'
              },
              {
                id: 'test2',
                title: 'Lagos Bookmark',
                url: 'https://github.com',
                color: '#3A86FF',
                userId: 'default-user'
              }
            ];
            setBookmarks(testBookmarks);
          }
        },
        (error) => {
          console.error('Error fetching bookmarks:', error);
          console.error('Error details:', error.code, error.message);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up bookmarks listener:', error);
    }
  }, []);

  // Subscribe to notes from Firebase
  useEffect(() => {
    if (!db) {
      console.error('Firestore database is not initialized');
      // Set test notes as fallback
      const testNotes = [
        {
          id: 'test-note-1',
          title: 'Tokyo Note',
          content: 'This is a test note in Tokyo',
          userId: 'default-user'
        },
        {
          id: 'test-note-2',
          title: 'Beijing Note',
          content: 'Another test note in Beijing',
          userId: 'default-user'
        }
      ];
      setNotes(testNotes);
      return;
    }
    
    console.log('Setting up notes subscription...');
    
    try {
      const notesRef = collection(db, 'notes');
      
      const unsubscribe = onSnapshot(
        notesRef,
        (snapshot) => {
          console.log('Notes snapshot received:', snapshot.size, 'documents');
          
          const notesData = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Note document:', doc.id, data);
            notesData.push({
              id: doc.id,
              ...data
            });
          });
          
          // Use all notes (no userId filtering needed)
          console.log('Total notes found:', notesData.length);
          
          // Use real notes if available, otherwise use test notes
          if (notesData.length > 0) {
            setNotes(notesData);
          } else {
            console.log('No user notes found, using test notes');
            const testNotes = [
              {
                id: 'test-note-1',
                title: 'Tokyo Note',
                content: 'This is a test note in Tokyo',
                userId: 'default-user'
              },
              {
                id: 'test-note-2',
                title: 'Beijing Note',
                content: 'Another test note in Beijing',
                userId: 'default-user'
              }
            ];
            setNotes(testNotes);
          }
        },
        (error) => {
          console.error('Error fetching notes:', error);
          console.error('Error details:', error.code, error.message);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up notes listener:', error);
    }
  }, []);

  // Add bookmarks to map
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.L || bookmarks.length === 0) {
      return;
    }

    // Remove existing bookmark markers
    bookmarkMarkersRef.current.forEach(marker => {
      try {
        mapInstanceRef.current.removeLayer(marker);
      } catch (e) {}
    });
    bookmarkMarkersRef.current = [];

    // Add bookmark markers
    bookmarks.forEach((bookmark, index) => {
      // Check if there's a custom position for this bookmark
      const customPosKey = `bookmark_${bookmark.id}`;
      const customPos = customPositions[customPosKey];
      
      let lat, lng;
      if (customPos) {
        lat = customPos.lat;
        lng = customPos.lng;
      } else {
        const locationIndex = index % africanLocations.length;
        // Add small random offset to prevent exact overlapping
        const offset = 0.1; // Small offset in degrees
        lat = africanLocations[locationIndex].lat + (Math.random() - 0.5) * offset;
        lng = africanLocations[locationIndex].lng + (Math.random() - 0.5) * offset;
      }
      
      const markerHtml = `
        <div class="location-marker location-marker-small">
          <div class="marker-icon-wrapper">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <div class="marker-title marker-title-small">
            ${bookmark.title || 'Bookmark'}
          </div>
        </div>
      `;

      const customIcon = window.L.divIcon({
        className: 'custom-marker-wrapper',
        html: markerHtml,
        iconSize: [31, 39],
        iconAnchor: [16, 31],
        popupAnchor: [0, -31]
      });

      const marker = window.L.marker([lat, lng], { 
        icon: customIcon,
        riseOnHover: true,
        draggable: true,
        zIndexOffset: 500
      });

      marker.on('click', () => {
        if (!isDraggingRef.current && bookmark.url) {
          let url = bookmark.url;
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
          }
          window.open(url, '_blank');
        }
      });

      marker.on('dragstart', () => {
        isDraggingRef.current = true;
      });

      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        saveMarkerPosition(bookmark.id, 'bookmark', lat, lng);
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 100);
      });

      marker.addTo(mapInstanceRef.current);
      bookmarkMarkersRef.current.push(marker);
    });
  }, [bookmarks, mapReady, customPositions]);

  // Add notes to map
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.L || notes.length === 0) {
      return;
    }

    // Remove existing note markers
    noteMarkersRef.current.forEach(marker => {
      try {
        mapInstanceRef.current.removeLayer(marker);
      } catch (e) {}
    });
    noteMarkersRef.current = [];

    // Add note markers
    notes.forEach((note, index) => {
      // Check if there's a custom position for this note
      const customPosKey = `note_${note.id}`;
      const customPos = customPositions[customPosKey];
      
      let lat, lng;
      if (customPos) {
        lat = customPos.lat;
        lng = customPos.lng;
      } else {
        const locationIndex = index % asianLocations.length;
        // Add small random offset to prevent exact overlapping
        const offset = 0.1; // Small offset in degrees
        lat = asianLocations[locationIndex].lat + (Math.random() - 0.5) * offset;
        lng = asianLocations[locationIndex].lng + (Math.random() - 0.5) * offset;
      }
      
      const markerHtml = `
        <div class="location-marker location-marker-small">
          <div class="marker-icon-wrapper">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div class="marker-title marker-title-small">
            ${note.title || 'Note'}
          </div>
        </div>
      `;

      const customIcon = window.L.divIcon({
        className: 'custom-marker-wrapper',
        html: markerHtml,
        iconSize: [31, 39],
        iconAnchor: [16, 31],
        popupAnchor: [0, -31]
      });

      const marker = window.L.marker([lat, lng], { 
        icon: customIcon,
        riseOnHover: true,
        draggable: true,
        zIndexOffset: 1000
      });

      marker.on('click', () => {
        if (!isDraggingRef.current) {
          navigate('/notes', { state: { selectedNoteId: note.id } });
        }
      });

      marker.on('dragstart', () => {
        isDraggingRef.current = true;
      });

      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        saveMarkerPosition(note.id, 'note', lat, lng);
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 100);
      });

      marker.addTo(mapInstanceRef.current);
      noteMarkersRef.current.push(marker);
    });
  }, [notes, navigate, mapReady, customPositions]);

  return (
    <div className="home-page page-container">
      <div id="map" ref={mapRef}></div>
    </div>
  );
};

export default Home;