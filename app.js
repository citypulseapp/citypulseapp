let map;
let markers = [];
let eventsData = [];

const EVENT_ICONS = {
    permit: '🏗️',
    infrastructure: '🚧',
    commercial: '�',
    census: '�',
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

function translateToHumanReadable(event) {
    // Translate government-speak to normal English
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
            renderTopChanges();
            renderSummaryCards();
            renderNeighborhoodActivity();
            renderFeed();
            renderMarkers();
        })
        .catch(error => {
            console.error('Error loading events:', error);
            document.getElementById('activity-feed').innerHTML =
                '<div class="loading">Error loading events. Please refresh the page.</div>';
        });
}

function renderTopChanges() {
    const container = document.getElementById('top-changes');
    const topEvents = eventsData.slice(0, 5);

    container.innerHTML = topEvents.map((event, index) => `
        <div class="top-change-item" data-id="${event.id}">
            <span class="change-icon">${EVENT_ICONS[event.type] || '📍'}</span>
            <div class="change-content">
                <div class="change-title">${index + 1}. ${translateToHumanReadable(event)}</div>
                <div class="change-location">${event.address}</div>
            </div>
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.top-change-item').forEach(item => {
        item.addEventListener('click', () => {
            const eventId = item.dataset.id;
            const event = eventsData.find(e => e.id === eventId);
            if (event) {
                map.setView([event.lat, event.lng], 15);
                const marker = markers.find(m => m.eventId === eventId);
                if (marker) {
                    marker.openPopup();
                }
            }
        });
    });
}

function renderSummaryCards() {
    const container = document.getElementById('summary-cards');

    const permitCount = eventsData.filter(e => e.type === 'permit').length;
    const infrastructureCount = eventsData.filter(e => e.type === 'infrastructure').length;
    const commercialCount = eventsData.filter(e => e.type === 'commercial').length;
    const totalCount = eventsData.length;

    container.innerHTML = `
        <div class="summary-card">
            <div class="number">${permitCount}</div>
            <div class="label">Development Projects</div>
        </div>
        <div class="summary-card">
            <div class="number">${infrastructureCount}</div>
            <div class="label">Infrastructure</div>
        </div>
        <div class="summary-card">
            <div class="number">${commercialCount}</div>
            <div class="label">Commercial Activity</div>
        </div>
        <div class="summary-card">
            <div class="number">${totalCount}</div>
            <div class="label">Total Changes</div>
        </div>
    `;
}

function renderNeighborhoodActivity() {
    const container = document.getElementById('neighborhood-activity');

    // Group events by neighborhood (simplified by area)
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
            <div class="activity-bar">
                <div class="activity-fill" style="width: ${(count / maxCount) * 100}%"></div>
            </div>
            <div class="activity-count">${count}</div>
        </div>
    `).join('');
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
                <span class="event-title">${humanReadableTitle}</span>
            </div>
            <div class="event-address">${event.address}</div>
            <div class="event-date">${formatDate(event.date)}</div>
            <span class="event-type-badge ${event.type}">${event.type}</span>
        `;

        card.addEventListener('click', () => {
            map.setView([event.lat, event.lng], 15);
            const marker = markers.find(m => m.eventId === event.id);
            if (marker) {
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
        const color = EVENT_COLORS[event.type] || '#667eea';
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
    const showInfrastructure = document.getElementById('filter-infrastructure').checked;
    const showCommercial = document.getElementById('filter-commercial').checked;

    markers.forEach(marker => {
        const shouldShow =
            (marker.eventType === 'permit' && showPermit) ||
            (marker.eventType === 'infrastructure' && showInfrastructure) ||
            (marker.eventType === 'commercial' && showCommercial) ||
            (marker.eventType === 'census' && showPermit) ||
            (marker.eventType === 'epa' && showInfrastructure);

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
            (type === 'infrastructure' && showInfrastructure) ||
            (type === 'commercial' && showCommercial) ||
            (type === 'census' && showPermit) ||
            (type === 'epa' && showInfrastructure);

        card.classList.toggle('hidden', !shouldShow);
    });
}

function initFilters() {
    document.getElementById('filter-permit').addEventListener('change', applyFilters);
    document.getElementById('filter-infrastructure').addEventListener('change', applyFilters);
    document.getElementById('filter-commercial').addEventListener('change', applyFilters);
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initFilters();
    loadEvents();
});
