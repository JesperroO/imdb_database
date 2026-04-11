// Global state
let currentPage = 0;
const pageSize = 20;
let allMovies = [];
let filteredMovies = [];
let currentGenre = 'all';
let searchKeyword = '';

// DOM elements
const grid = document.getElementById('movies-grid');
const loadingEl = document.getElementById('loading');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadMovies();
    setupEventListeners();
});

async function loadMovies() {
    showLoading(true);
    try {
        const movies = await getMovies(1000, 0);
        allMovies = movies || [];
        applyFilters();
    } catch (error) {
        grid.innerHTML = `<p class="col-span-full text-center py-12 text-red-500">Failed to load: ${error.message}</p>`;
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    loadingEl.classList.toggle('hidden', !show);
    grid.classList.toggle('hidden', show);
}

function applyFilters() {
    let result = [...allMovies];
    if (searchKeyword.trim()) {
        const keyword = searchKeyword.trim().toLowerCase();
        result = result.filter(movie => {
            const title = (movie.title || '').toLowerCase();
            const overview = (movie.overview || '').toLowerCase();
            const director = (movie.director_name || '').toLowerCase();
            return title.includes(keyword) || overview.includes(keyword) || director.includes(keyword);
        });
    }
    filteredMovies = result;
    currentPage = 0;
    renderPage();
}

function renderPage() {
    const start = currentPage * pageSize;
    const end = start + pageSize;
    const pageMovies = filteredMovies.slice(start, end);
    
    if (pageMovies.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-center py-12 text-gray-500">No movies found</p>`;
    } else {
        grid.innerHTML = pageMovies.map(movie => createMovieCard(movie)).join('');
        document.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                window.location.href = `movie.html?id=${card.dataset.id}`;
            });
        });
    }
    
    const totalPages = Math.ceil(filteredMovies.length / pageSize);
    pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages || 1}`;
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage >= totalPages - 1;
}

function createMovieCard(movie) {
    const poster = getHighResPoster(movie.poster_link, 300);
    const rating = movie.imdb_rating ? movie.imdb_rating.toFixed(1) : '?';
    const year = movie.year || 'Unknown';
    const director = movie.director_name || 'Unknown director';
    
    return `
        <div class="movie-card bg-white rounded-xl shadow-md overflow-hidden cursor-pointer transition hover:shadow-xl" data-id="${movie.movie_id}">
            <div class="relative pb-[140%] bg-gray-200">
                <img src="${poster}" alt="${movie.title}" 
                     class="absolute w-full h-full object-cover" 
                     loading="lazy"
                     referrerpolicy="no-referrer"
                     onerror="this.onerror=null; this.src=getRandomPlaceholder();">
                <div class="absolute top-2 right-2 bg-black/70 text-yellow-400 font-bold px-2 py-1 rounded-lg text-sm backdrop-blur-sm">
                    <i class="fas fa-star mr-1 text-xs"></i>${rating}
                </div>
            </div>
            <div class="p-4">
                <h3 class="font-bold text-gray-800 truncate" title="${movie.title}">${movie.title}</h3>
                <div class="flex items-center text-gray-500 text-sm mt-1 space-x-3">
                    <span><i class="far fa-calendar-alt mr-1"></i>${year}</span>
                    <span><i class="far fa-clock mr-1"></i>${movie.runtime || '?'}min</span>
                </div>
                <p class="text-gray-500 text-sm mt-1 truncate">${director}</p>
                <div class="mt-3 flex justify-between items-center">
                    <span class="text-xs text-gray-400"><i class="far fa-thumbs-up mr-1"></i>${formatNumber(movie.votes)}</span>
                    <span class="text-indigo-600 text-sm font-medium hover:text-indigo-800">Details <i class="fas fa-arrow-right ml-1 text-xs"></i></span>
                </div>
            </div>
        </div>
    `;
}

function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

async function filterByGenre(genre) {
    if (genre === 'all') {
        showLoading(true);
        try {
            const movies = await getMovies(1000, 0);
            allMovies = movies || [];
            searchKeyword = '';
            searchInput.value = '';
            applyFilters();
        } catch (error) {
            console.error('Failed to load all movies:', error);
        } finally {
            showLoading(false);
        }
        return;
    }
    
    showLoading(true);
    try {
        const movies = await getMoviesByGenre(genre);
        allMovies = movies || [];
        searchKeyword = '';
        searchInput.value = '';
        applyFilters();
    } catch (error) {
        console.error('Genre filter failed:', error);
        alert(`Filter failed: ${error.message}`);
        const movies = await getMovies(1000, 0);
        allMovies = movies || [];
        applyFilters();
    } finally {
        showLoading(false);
    }
}

function setupEventListeners() {
    prevBtn.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            renderPage();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredMovies.length / pageSize);
        if (currentPage < totalPages - 1) {
            currentPage++;
            renderPage();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    searchBtn.addEventListener('click', () => {
        searchKeyword = searchInput.value;
        applyFilters();
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchKeyword = searchInput.value;
            applyFilters();
        }
    });
    
    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchKeyword = searchInput.value;
            applyFilters();
        }, 300);
    });
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const genre = btn.dataset.genre;
            currentGenre = genre;
            
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('bg-indigo-600', 'text-white', 'border-indigo-600');
                b.classList.add('bg-white', 'border-gray-300', 'text-gray-700');
            });
            btn.classList.remove('bg-white', 'border-gray-300', 'text-gray-700');
            btn.classList.add('bg-indigo-600', 'text-white', 'border-indigo-600');
            
            await filterByGenre(genre);
        });
    });
}