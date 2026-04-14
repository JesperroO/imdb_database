// API Base Configuration
const API_BASE = 'http://127.0.0.1:7777/api';

// Generic GET request wrapper
async function fetchAPI(endpoint, params = {}) {
    const url = new URL(`${API_BASE}${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// 1. Get movie list
async function getMovies(limit = 100, offset = 0) {
    return await fetchAPI('/movies', { limit, offset });
}

// 2. Get single movie details
async function getMovieDetail(movieId) {
    return await fetchAPI(`/movies/${movieId}`);
}

// 3. Get movies by genre
async function getMoviesByGenre(genre) {
    return await fetchAPI(`/movies/genre/${encodeURIComponent(genre)}`);
}

// 4. Get director's movies
async function getDirectorMovies(directorId) {
    return await fetchAPI(`/movies/director/${directorId}`);
}

// 5. Get genre statistics (movie count)
async function getGenreStats() {
    return await fetchAPI('/stats/genres');
}

// 6. Get Top N movies
async function getTopMovies(topN = 10) {
    return await fetchAPI('/movies/top', { top_n: topN });
}

// 7. Get average rating by genre
async function getGenreRatingStats() {
    return await fetchAPI('/stats/genres/rating');
}

// 8. Get actor details and movies
async function getActorMovies(actorId) {
    return await fetchAPI(`/stats/actors/${actorId}`);
}

// ========== LLM Natural Language APIs ==========

/**
 * Send natural language query to generate SQL and execute
 * @param {string} query - User's natural language input
 * @param {string} strategy - Prompt strategy: 'zero-shot' | 'few-shot' | 'constrained' | 'hybrid', default 'hybrid'
 * @returns {Promise<Object>} { generated_sql, results, result_count, latency_ms, react_trace, ... }
 */
async function queryNaturalLanguage(query, strategy = 'hybrid') {
    const url = `${API_BASE}/query/nl`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, strategy })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return await response.json();
}

/**
 * Send natural language recommendation request
 * @param {string} query - User's preference description
 * @param {string} strategy - Prompt strategy, default 'hybrid'
 * @returns {Promise<Object>}
 */
async function recommendNaturalLanguage(query, strategy = 'hybrid') {
    const url = `${API_BASE}/recommend/nl`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, strategy })
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    return await response.json();
}

// ========== Utility Functions ==========

// Convert IMDb thumbnail URL to high-res poster
function getHighResPoster(url, width = 300) {
    if (!url || typeof url !== 'string') return getRandomPlaceholder();
    return url.replace(/\._V1_UX\d+_CR\d+,\d+,\d+,\d+_AL_\.jpg$/i, `._V1_UX${width}_.jpg`);
}

// Fallback placeholder images (ensure these exist in assets folder)
const PLACEHOLDER_IMAGES = [
    'assets/placeholder1.jpg',
    'assets/placeholder2.jpg',
    'assets/placeholder3.jpg',
    'assets/placeholder4.jpg',
    'assets/placeholder5.jpg'
];

// Get random placeholder image
function getRandomPlaceholder() {
    const randomIndex = Math.floor(Math.random() * PLACEHOLDER_IMAGES.length);
    return PLACEHOLDER_IMAGES[randomIndex];
}