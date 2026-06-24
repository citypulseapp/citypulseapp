let map;
let markers = [];
let eventsData = [];

const EVENT_ICONS = {
    permit: '🏗️',
    sale: '🏠',
    infrastructure: '🚧'
};

const EVENT_COLORS = {
    permit: '#22c55e',
    sale: '#3b82f6',
    infrastructure: '#f97316'
};

function initMap() {
    map = L.map('map').setView([43.2095, -77.6835], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

function createCustomIcon(color) {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background: ${color};
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
}

function loadEvents() {
    fetch('data/greece_events.json')
        .then(response => response.json())
        .then(data => {
            eventsData = data;
            renderFeed();
            renderMarkers();
        })
        .catch(error => {
            console.error('Error loading events:', error);
            document.getElementById('activity-feed').innerHTML = 
                '<div class="loading">Error loading events. Please refresh the page.</div>';
        });
}

function renderFeed() {
    const feed = document.getElementById('activity-feed');
    feed.innerHTML = '';

    const sortedEvents = [...eventsData].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedEvents.forEach(event => {
        const card = document.createElement('div');
        card.className = `event-card`;
        card.dataset.type = event.type;
        card.dataset.id = event.id;
        
        card.innerHTML = `
            <div class="event-header">
                <span class="event-icon">${EVENT_ICONS[event.type]}</span>
                <span class="event-title">${event.title}</span>
            </div>
            <div class="event-address">${event.address}</div>
            <div class="event-date">${formatDate(event.date)}</div>
            <span class="event-type-badge ${event.type}">${event.type}</span>
        `;

        card.addEventListener('click', () => {
            const marker = markers.find(m => m.eventId === event.id);
            if (marker) {
                map.setView([event.lat, event.lng], 15);
                marker.openPopup();
            }
        });

        feed.appendChild(card);
    });
}

function renderMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    eventsData.forEach(event => {
        const icon = createCustomIcon(EVENT_COLORS[event.type]);
        
        const marker = L.marker([event.lat, event.lng], { icon })
            .addTo(map)
            .bindPopup(`
                <div class="popup-title">${EVENT_ICONS[event.type]} ${event.title}</div>
                <div class="popup-address">${event.address}</div>
                <div class="popup-date">${formatDate(event.date)}</div>
            `);
        
        marker.eventId = event.id;
        marker.eventType = event.type;
        markers.push(marker);
    });

    applyFilters();
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function applyFilters() {
    const showPermit = document.getElementById('filter-permit').checked;
    const showSale = document.getElementById('filter-sale').checked;
    const showInfrastructure = document.getElementById('filter-infrastructure').checked;

    markers.forEach(marker => {
        const shouldShow = 
            (marker.eventType === 'permit' && showPermit) ||
            (marker.eventType === 'sale' && showSale) ||
            (marker.eventType === 'infrastructure' && showInfrastructure);
        
        if (shouldShow) {
            marker.addTo(map);
        } else {
            map.removeLayer(marker);
        }
    });

    const feedCards = document.querySelectorAll('.event-card');
    feedCards.forEach(card => {
        const type = card.dataset.type;
        const shouldShow = 
            (type === 'permit' && showPermit) ||
            (type === 'sale' && showSale) ||
            (type === 'infrastructure' && showInfrastructure);
        
        card.classList.toggle('hidden', !shouldShow);
    });
}

function initFilters() {
    document.getElementById('filter-permit').addEventListener('change', applyFilters);
    document.getElementById('filter-sale').addEventListener('change', applyFilters);
    document.getElementById('filter-infrastructure').addEventListener('change', applyFilters);
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initFilters();
    loadEvents();
});
