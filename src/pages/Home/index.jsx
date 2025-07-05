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
  ExternalLink
} from 'lucide-react';
import CurlinPumpIcon from '../../components/icons/CurlinPumpIcon';
import { db, auth } from '../../config/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [bookmarks, setBookmarks] = useState([]);
  const bookmarkMarkersRef = useRef([]);

  // Location data with all 13 app sections - spread distribution for better visibility
  const locations = [
    {
      name: 'Home',
      icon: HomeIcon,
      class: 'marker-home',
      coords: [29.5523, -95.1356], // Friendswood (keep as requested)
      path: '/'
    },
    {
      name: 'Shop',
      icon: ShoppingCart,
      class: 'marker-shop',
      coords: [29.8901, -95.7234], // Far Northwest
      path: '/shop'
    },
    {
      name: 'Pump',
      icon: CurlinPumpIcon,
      class: 'marker-pump',
      coords: [29.6234, -95.6789], // West
      path: '/pump'
    },
    {
      name: 'Medications',
      icon: Pill,
      class: 'marker-medications',
      coords: [29.8456, -95.0123], // Far Northeast
      path: '/medications'
    },
    {
      name: 'Calculator',
      icon: Calculator,
      class: 'marker-calculator',
      coords: [29.9567, -95.3789], // Far North
      path: '/calculator'
    },
    {
      name: 'Note Generator',
      icon: Zap,
      class: 'marker-note-generator',
      coords: [29.7890, -95.8456], // Far West
      path: '/note-generator'
    },
    {
      name: 'Analyzer',
      icon: ScanLine,
      class: 'marker-analyzer',
      coords: [29.5890, -94.9234], // Far East
      path: '/analyzer'
    },
    {
      name: 'Bookmarks',
      icon: Bookmark,
      class: 'marker-bookmarks',
      coords: [29.9234, -95.1567], // North
      path: '/bookmark-manager'
    },
    {
      name: 'Calendar',
      icon: Calendar,
      class: 'marker-calendar',
      coords: [29.7123, -94.8567], // Far East
      path: '/calendar'
    },
    {
      name: 'Notes',
      icon: StickyNote,
      class: 'marker-notes',
      coords: [29.4567, -95.3234], // South
      path: '/notes'
    },
    {
      name: 'Supplies',
      icon: Package,
      class: 'marker-supplies',
      coords: [29.5012, -94.9789], // Southeast
      path: '/supplies'
    },
    {
      name: 'Workflow',
      icon: GitBranch,
      class: 'marker-workflow',
      coords: [29.8789, -95.5234], // Northwest
      path: '/workflow'
    },
    {
      name: 'GPT',
      icon: Bot,
      class: 'marker-gpt',
      coords: [29.4234, -95.7890], // Far Southwest
      path: '/gpt'
    }
  ];

  useEffect(() => {
    // Load Leaflet CSS
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const leafletCSS = document.createElement('link');
      leafletCSS.rel = 'stylesheet';
      leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(leafletCSS);
    }

    // Load Leaflet JS
    const loadLeaflet = () => {
      return new Promise((resolve, reject) => {
        if (window.L) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    // Initialize map after Leaflet loads
    let themeObserver;
    let handleResize;
    
    loadLeaflet().then(() => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        // Keep the equalizer animation running continuously
        // No need to hide it as it's a persistent visual effect

        // Initialize the map centered to show all markers
        const map = window.L.map(mapRef.current, {
          center: [29.7604, -95.3698], // Center of Houston
          zoom: 10, // Show Houston area
          zoomControl: true,
          minZoom: 3, // Allow zooming out to show 300km+ scale
          maxZoom: 18,
          attributionControl: false // Remove attribution
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

        // Store all markers for bounds calculation
        const allMarkers = [];

        // Create markers for each location
        locations.forEach((location, index) => {
          const Icon = location.icon;
          
          // Convert React icon to HTML string
          const iconHtml = ReactDOMServer.renderToStaticMarkup(
            <Icon size={24} />
          );

          // Create custom HTML for marker
          const markerHtml = `
            <div class="location-marker ${location.class}">
              <div class="marker-icon-wrapper">
                ${iconHtml}
              </div>
              <div class="marker-title">
                ${location.name}
              </div>
            </div>
          `;

          // Create custom icon
          const customIcon = window.L.divIcon({
            className: 'custom-marker-wrapper',
            html: markerHtml,
            iconSize: [60, 80],
            iconAnchor: [30, 60],
            popupAnchor: [0, -60]
          });

          // Create marker
          const marker = window.L.marker(location.coords, { 
            icon: customIcon,
            riseOnHover: true
          });

          // Store marker for bounds
          allMarkers.push(marker);

          // Add click handler - navigate immediately without zoom
          marker.on('click', (e) => {
            // Add clicked class to marker for visual feedback
            const markerElement = e.target.getElement();
            if (markerElement) {
              markerElement.querySelector('.location-marker').classList.add('clicked');
            }
            
            // Navigate immediately
            navigate(location.path);
          });

          // Add marker with delay for animation
          setTimeout(() => {
            marker.addTo(map);
          }, index * 100);
        });

        // Add a circle around home (Friendswood)
        window.L.circle([29.5523, -95.1356], {
          color: '#2196F3',
          fillColor: '#2196F3',
          fillOpacity: 0.1,
          radius: 2000,
          weight: 1
        }).addTo(map);

        // Scale control removed as requested

        // Don't auto-fit bounds since we're showing both Texas and California
        // Keep the map centered on California to show bookmarks
        
        // Handle window resize - maintain view
        handleResize = () => {
          // Just maintain the current view on resize
          map.invalidateSize();
        };
        
        window.addEventListener('resize', handleResize);
        
        // Listen for theme changes to update map tiles
        themeObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
              const isDarkTheme = document.documentElement.getAttribute('data-theme') !== 'light';
              const newTileUrl = isDarkTheme 
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
              
              // Remove existing tile layer
              map.eachLayer((layer) => {
                if (layer instanceof window.L.TileLayer) {
                  map.removeLayer(layer);
                }
              });
              
              // Add new tile layer with updated theme
              window.L.tileLayer(newTileUrl, {
                subdomains: 'abcd',
                maxZoom: 20
              }).addTo(map);
            }
          });
        });
        
        themeObserver.observe(document.documentElement, { attributes: true });

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }).catch(error => {
      console.error('Error loading Leaflet:', error);
    });

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      // Remove resize listener
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      // Disconnect theme observer
      if (themeObserver) {
        themeObserver.disconnect();
      }
    };
  }, [navigate, locations]);

  // Subscribe to bookmarks from Firebase
  useEffect(() => {
    if (!db) {
      console.error('Firestore database is not initialized');
      return;
    }
    
    console.log('Setting up bookmarks subscription...');
    
    // Use query to filter by userId directly
    const userId = 'default-user'; // Using default user for now
    console.log('Fetching bookmarks for userId:', userId);
    
    try {
      const bookmarksRef = collection(db, 'bookmarks');
      
      const unsubscribe = onSnapshot(
        bookmarksRef,
        (snapshot) => {
          console.log('Bookmarks snapshot received:', snapshot.size, 'documents');
          
          if (snapshot.empty) {
            console.log('No bookmarks found in the collection');
            setBookmarks([]);
            return;
          }
          
          const bookmarksData = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Bookmark document:', doc.id, data);
            bookmarksData.push({
              id: doc.id,
              ...data
            });
          });
          
          // Filter by userId
          const userBookmarks = bookmarksData.filter(item => item.userId === userId);
          console.log('Filtered user bookmarks:', userBookmarks.length);
          
          // If no bookmarks found, add some test bookmarks to verify rendering
          if (userBookmarks.length === 0 && bookmarksData.length === 0) {
            console.log('No bookmarks found, adding test bookmarks');
            const testBookmarks = [
              {
                id: 'test1',
                title: 'Test Bookmark 1',
                url: 'https://google.com',
                color: '#FF006E',
                userId: 'default-user'
              },
              {
                id: 'test2',
                title: 'Test Bookmark 2',
                url: 'https://github.com',
                color: '#3A86FF',
                userId: 'default-user'
              }
            ];
            setBookmarks(testBookmarks);
          } else {
            setBookmarks(userBookmarks);
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
    console.log('Bookmark map effect - bookmarks:', bookmarks.length);
    console.log('Map instance:', !!mapInstanceRef.current);
    console.log('Leaflet loaded:', !!window.L);
    
    if (!mapInstanceRef.current || !window.L) {
      console.log('Skipping bookmark rendering - map or Leaflet not ready');
      return;
    }
    
    if (bookmarks.length === 0) {
      console.log('No bookmarks to display');
      // Don't return - continue to show test bookmark
    }

    // Wait a bit to ensure map is fully initialized
    setTimeout(() => {
      console.log('Rendering bookmarks on map...');

      // Remove existing bookmark markers
      bookmarkMarkersRef.current.forEach(marker => {
        try {
          mapInstanceRef.current.removeLayer(marker);
        } catch (e) {
          console.error('Error removing old marker:', e);
        }
      });
      bookmarkMarkersRef.current = [];

      // California major cities for bookmark placement
      const californiaLocations = [
        { lat: 34.0522, lng: -118.2437 }, // Los Angeles
        { lat: 37.7749, lng: -122.4194 }, // San Francisco
        { lat: 32.7157, lng: -117.1611 }, // San Diego
        { lat: 38.5816, lng: -121.4944 }, // Sacramento
        { lat: 36.7378, lng: -119.7871 }, // Fresno
        { lat: 37.3382, lng: -121.8863 }, // San Jose
        { lat: 37.8044, lng: -122.2712 }, // Oakland
        { lat: 33.7701, lng: -118.1937 }, // Long Beach
        { lat: 34.4208, lng: -119.6982 }, // Santa Barbara
        { lat: 33.5899, lng: -117.8732 }, // Newport Beach
      ];

      // Add a test bookmark if none exist
      const bookmarksToRender = bookmarks.length > 0 ? bookmarks : [{
        id: 'test-bookmark',
        title: 'Sample Bookmark',
        url: 'https://example.com',
        color: '#FF5500',
        userId: 'default-user'
      }];
      
      console.log('Rendering bookmarks:', bookmarksToRender.length);

      // Add bookmark markers spread across California
      bookmarksToRender.forEach((bookmark, index) => {
        console.log('Adding bookmark to map:', bookmark.title);
        
        // Use saved coordinates if available, otherwise use California city coordinates
        let lat, lng;
        if (bookmark.coordinates) {
          lat = bookmark.coordinates.lat;
          lng = bookmark.coordinates.lng;
        } else {
          // Use California city coordinates, cycling through them
          const locationIndex = index % californiaLocations.length;
          lat = californiaLocations[locationIndex].lat;
          lng = californiaLocations[locationIndex].lng;
        }
        
        // Create custom HTML for bookmark marker - simplified to avoid ReactDOMServer issues
        const markerHtml = `
        <div class="location-marker bookmark-marker" style="background: ${bookmark.color || '#ff5500'};">
          <div class="marker-icon-wrapper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <div class="marker-title bookmark-title">
            ${bookmark.title || 'Bookmark'}
          </div>
        </div>
      `;

        // Create custom icon
        const customIcon = window.L.divIcon({
          className: 'custom-marker-wrapper',
          html: markerHtml,
          iconSize: [60, 80],
          iconAnchor: [30, 60],
          popupAnchor: [0, -60]
        });

        try {
          // Create marker
          const marker = window.L.marker([lat, lng], { 
            icon: customIcon,
            riseOnHover: true
          });

          // Add click handler to open bookmark URL
          marker.on('click', () => {
            if (bookmark.url) {
              let url = bookmark.url;
              if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
              }
              window.open(url, '_blank');
            }
          });

          // Add to map immediately without delay to avoid timing issues
          console.log(`Adding marker for bookmark "${bookmark.title}" at [${lat}, ${lng}]`);
          marker.addTo(mapInstanceRef.current);
          bookmarkMarkersRef.current.push(marker);
          console.log('Total bookmark markers on map:', bookmarkMarkersRef.current.length);
        } catch (error) {
          console.error(`Error adding marker for bookmark "${bookmark.title}":`, error);
        }
      });
    }, 500); // Wait 500ms to ensure map is ready
  }, [bookmarks]);

  return (
    <div className="home-page">
      <div id="map" ref={mapRef}></div>
    </div>
  );
};

export default Home;