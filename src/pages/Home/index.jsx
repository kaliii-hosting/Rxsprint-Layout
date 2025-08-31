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


const Home = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const bookmarkMarkersRef = useRef([]);
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
    let recalculateMinZoom;

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
        
        // Calculate the aspect ratio of the viewport
        const viewportHeight = mapRef.current.clientHeight;
        const viewportWidth = mapRef.current.clientWidth;
        const aspectRatio = viewportWidth / viewportHeight;
        
        // Calculate minimum zoom to prevent dead spaces
        // Leaflet uses Web Mercator projection where the world is square at zoom 0 (256x256 px)
        // But we limit latitude to ±85° which makes the visible world roughly 256x226 px at zoom 0
        let minZoomLevel;
        
        // Calculate pixels per degree at zoom level 0
        const degreesLongitude = 360;
        const degreesLatitude = 170; // ±85 degrees
        const baseWorldWidth = 256;
        const baseWorldHeight = (256 * degreesLatitude) / degreesLongitude; // ~226 px
        
        // Calculate zoom needed to fill viewport width
        const zoomToFitWidth = Math.log2(viewportWidth / baseWorldWidth);
        
        // Calculate zoom needed to fill viewport height  
        const zoomToFitHeight = Math.log2(viewportHeight / baseWorldHeight);
        
        // Use the larger zoom to ensure no dead space
        minZoomLevel = Math.max(zoomToFitWidth, zoomToFitHeight);
        
        // Round up to ensure complete coverage and add small buffer
        minZoomLevel = Math.ceil(minZoomLevel * 10) / 10 + 0.2;
        
        // Initialize the map with mobile-friendly settings
        const map = window.L.map(mapRef.current, {
          center: [0, 0], // Center of world (Equator and Prime Meridian)
          zoom: minZoomLevel, // Start at minimum zoom to fill viewport
          zoomControl: true,
          minZoom: minZoomLevel, // Dynamic min zoom based on aspect ratio
          maxZoom: 18,
          attributionControl: false,
          maxBoundsViscosity: 1.0,
          worldCopyJump: false, // Disable to prevent duplicate worlds
          // Set max bounds to prevent panning beyond world limits
          maxBounds: [[-90, -180], [90, 180]],
          // Prevent wrapping
          noWrap: true,
          // Ensure the map fills the container
          zoomSnap: 0.1,
          zoomDelta: 0.1
        });
        
        mapInstanceRef.current = map;

        // Add theme-appropriate tiles
        const isDarkTheme = document.documentElement.getAttribute('data-theme') !== 'light';
        const tileUrl = isDarkTheme 
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
        
        window.L.tileLayer(tileUrl, {
          subdomains: 'abcd',
          maxZoom: 20,
          noWrap: true, // Prevent tile wrapping
          bounds: [[-90, -180], [90, 180]] // Limit tile loading to one world
        }).addTo(map);

        // Store map instance for page markers
        window.pageMarkersMap = map;
        window.pageMarkersNavigate = navigate;

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
                maxZoom: 20,
                noWrap: true,
                bounds: [[-90, -180], [90, 180]]
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
          
          // Ensure minimum zoom to prevent dead spaces
          if (zoom < minZoomLevel) {
            map.setZoom(minZoomLevel, { animate: false });
          }
        });
        
        // Handle window resize to recalculate min zoom
        recalculateMinZoom = () => {
          if (!mapRef.current) return;
          
          const newViewportHeight = mapRef.current.clientHeight;
          const newViewportWidth = mapRef.current.clientWidth;
          const newAspectRatio = newViewportWidth / newViewportHeight;
          
          // Use same calculation as initialization
          const degreesLongitude = 360;
          const degreesLatitude = 170; // ±85 degrees
          const baseWorldWidth = 256;
          const baseWorldHeight = (256 * degreesLatitude) / degreesLongitude;
          
          const zoomToFitWidth = Math.log2(newViewportWidth / baseWorldWidth);
          const zoomToFitHeight = Math.log2(newViewportHeight / baseWorldHeight);
          
          let newMinZoomLevel = Math.max(zoomToFitWidth, zoomToFitHeight);
          newMinZoomLevel = Math.ceil(newMinZoomLevel * 10) / 10 + 0.2;
          
          map.setMinZoom(newMinZoomLevel);
          if (map.getZoom() < newMinZoomLevel) {
            map.setZoom(newMinZoomLevel, { animate: false });
          }
        };
        
        // Add resize handler
        window.addEventListener('resize', recalculateMinZoom);

        // Add continent view buttons for mobile
        if (isMobile) {
          // Create buttons outside of Leaflet's control system for proper centering
          const continentContainer = document.createElement('div');
          continentContainer.className = 'continent-controls';
          continentContainer.innerHTML = `
            <div class="continent-buttons">
              <button class="continent-btn" data-continent="north-america">Pages</button>
              <button class="continent-btn" data-continent="africa">Bookmarks</button>
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
                case 'world':
                  // Use the minimum zoom level calculated based on viewport
                  const currentMinZoom = map.getMinZoom();
                  map.setView([0, 0], currentMinZoom, { animate: true });
                  break;
              }
            }
          });
          
          // Append to the map container (parent of the map)
          mapRef.current.parentElement.appendChild(continentContainer);
        }
        
        // Ensure map fills viewport and is centered after initialization
        setTimeout(() => {
          if (map && mapRef.current) {
            map.invalidateSize();
            // Center the map on coordinates 0,0
            map.setView([0, 0], minZoomLevel, { animate: false });
          }
        }, 100);
        
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
      if (recalculateMinZoom) {
        window.removeEventListener('resize', recalculateMinZoom);
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
        <Icon size={15} />
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
        iconSize: [36, 45],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
        iconSize: [36, 45],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
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


  return (
    <div className="home-page page-container">
      <div id="map" ref={mapRef}></div>
    </div>
  );
};

export default Home;