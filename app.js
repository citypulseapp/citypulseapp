let map;
let markers = [];
let eventsData = [];

const EVENT_ICONS = {
    permit: '🏗️',
    infrastructure: '🚧',
    commercial: '🏢',
    census: '📊',
    epa: '🌱'
};

const EVENT_COLORS = {
    permit: '#22c55e',
    infrastructure: '#f97316',
    commercial: '#3b82f6',
    census: '#9333ea',
    epa: '#10b981'
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
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10]
    });
}

function translateToHumanReadable(event) {
    const title = event.title;

    if (title.includes('Property improvements detected')) {
        return 'Property renovation or expansion project';
    } else if (title.includes('New construction built')) {
        return 'New home construction completed';
    } else if (title.includes('EPA')) {
        return 'Environmental monitoring activity';
    } else if (title.includes('Commercial Property')) {
        return 'Commercial property activity';
    } else if (title.includes('Census')) {
        return 'Demographic data update';
    } else {
        return title;
    }
}

function loadEvents() {
    fetch('data/greece_events.json')
        .then(response => response.json())
        .then(data => {
            eventsData = data;
            renderFeed();
            renderNeighborhoodList();
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

        const icon = EVENT_ICONS[event.type] || '📍';
        const humanReadableTitle = translateToHumanReadable(event);

        card.innerHTML = `
            <div class="event-header">
                <span class="event-icon">${icon}</span>
                <div class="event-content">
                    <div class="event-title">${humanReadableTitle}</div>
                    <div class="event-address">${event.address}</div>
                    <div class="event-date">${formatDate(event.date)}</div>
                </div>
            </div>
            <div class="event-actions">
                <button class="action-btn" onclick="likeEvent(this, event.id)">
                    <i class="far fa-heart"></i> Like
                </button>
                <button class="action-btn" onclick="shareEvent(this, event.id)">
                    <i class="far fa-comment"></i> Comment
                </button>
                <button class="action-btn" onclick="shareEvent(this, event.id)">
                    <i class="far fa-share-square"></i> Share
                </button>
                <button class="action-btn" onclick="viewOnMap(event.lat, event.lng, event.id)">
                    <i class="fas fa-map-marker-alt"></i> Map
                </button>
            </div>
        `;

        feed.appendChild(card);
    });
}

function renderNeighborhoodList() {
    const container = document.getElementById('neighborhood-list');

    const neighborhoods = {
        'North Greece': eventsData.filter(e => e.lat > 43.22).length,
        'Greece Ridge': eventsData.filter(e => e.lat >= 43.19 && e.lat <= 43.22).length,
        'Braddock Heights': eventsData.filter(e => e.lat >= 43.17 && e.lat < 43.19).length,
        'Charlotte': eventsData.filter(e => e.lat < 43.17).length
    };

    const maxCount = Math.max(...Object.values(neighborhoods));

    container.innerHTML = Object.entries(neighborhoods).map(([name, count]) => `
        <div class="neighborhood-item">
            <div class="neighborhood-name">${name}</div>
            <div class="neighborhood-bar">
                <div class="neighborhood-fill" style="width: ${(count / maxCount) * 100}%"></div>
            </div>
            <div class="neighborhood-count">${count}</div>
        </div>
    `).join('');
}

function renderMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    eventsData.forEach(event => {
        const color = EVENT_COLORS[event.type] || '#1a1a1a';
        const icon = createCustomIcon(color);

        const marker = L.marker([event.lat, event.lng], { icon })
            .addTo(map)
            .bindPopup(`
                <div class="popup-title">${EVENT_ICONS[event.type] || '📍'} ${translateToHumanReadable(event)}</div>
                <div class="popup-address">${event.address}</div>
                <div class="popup-date">${formatDate(event.date)}</div>
            `);

        marker.eventId = event.id;
        marker.eventType = event.type;
        markers.push(marker);
    });
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function likeEvent(button, eventId) {
    const icon = button.querySelector('i');
    if (icon.classList.contains('far')) {
        icon.classList.remove('far');
        icon.classList.add('fas');
        icon.style.color = '#e0245e';
        button.innerHTML = '<i class="fas fa-heart" style="color: #e0245e;"></i> Liked';
    } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
        icon.style.color = '';
        button.innerHTML = '<i class="far fa-heart"></i> Like';
    }
}

function shareEvent(button, eventId) {
    const event = eventsData.find(e => e.id === eventId);
    if (event) {
        const text = `${translateToHumanReadable(event)} at ${event.address}`;
        if (navigator.share) {
            navigator.share({
                title: 'CityPulse - Greece, NY',
                text: text,
                url: window.location.href
            });
        } else {
            alert('Share: ' + text);
        }
    }
}

function viewOnMap(lat, lng, eventId) {
    map.setView([lat, lng], 15);
    const marker = markers.find(m => m.eventId === eventId);
    if (marker) {
        marker.openPopup();
    }
}

function initFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterType = btn.textContent.toLowerCase();

            const feedCards = document.querySelectorAll('.event-card');
            feedCards.forEach(card => {
                const type = card.dataset.type;
                let shouldShow = false;

                if (filterType === 'all') {
                    shouldShow = true;
                } else if (filterType === 'permits') {
                    shouldShow = type === 'permit';
                } else if (filterType === 'infrastructure') {
                    shouldShow = type === 'infrastructure' || type === 'epa';
                } else if (filterType === 'commercial') {
                    shouldShow = type === 'commercial';
                }

                card.classList.toggle('hidden', !shouldShow);
            });

            markers.forEach(marker => {
                let shouldShow = false;

                if (filterType === 'all') {
                    shouldShow = true;
                } else if (filterType === 'permits') {
                    shouldShow = marker.eventType === 'permit';
                } else if (filterType === 'infrastructure') {
                    shouldShow = marker.eventType === 'infrastructure' || marker.eventType === 'epa';
                } else if (filterType === 'commercial') {
                    shouldShow = marker.eventType === 'commercial';
                }

                if (shouldShow) {
                    marker.addTo(map);
                } else {
                    map.removeLayer(marker);
                }
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initFilters();
    loadEvents();
});
