document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const directorId = urlParams.get('id');
    
    if (!directorId) {
        window.location.href = 'index.html';
        return;
    }
    
    const loadingEl = document.getElementById('loading');
    const infoEl = document.getElementById('director-info');
    const grid = document.getElementById('movies-grid');
    
    loadingEl.classList.remove('hidden');
    grid.innerHTML = '';
    
    try {
        const data = await getDirectorMovies(directorId);
        if (!data) throw new Error('Director not found');
        renderDirector(data.director, data.movies);
    } catch (error) {
        infoEl.innerHTML = `<p class="text-red-500 p-4">Failed to load: ${error.message}</p>`;
    } finally {
        loadingEl.classList.add('hidden');
    }
});

function renderDirector(director, movies) {
    const infoEl = document.getElementById('director-info');
    infoEl.innerHTML = `
        <div class="flex items-center space-x-4">
            <div class="bg-indigo-100 p-4 rounded-full">
                <i class="fas fa-user-tie text-4xl text-indigo-600"></i>
            </div>
            <div>
                <h1 class="text-3xl font-bold text-gray-800">${director.director_name}</h1>
                <p class="text-gray-600 mt-1"><i class="fas fa-film mr-1"></i>Directed ${movies.length} movies</p>
            </div>
        </div>
    `;
    
    const grid = document.getElementById('movies-grid');
    if (movies.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-center py-12 text-gray-500">No directed movies found</p>`;
        return;
    }
    
    grid.innerHTML = movies.map(movie => createMovieCard(movie)).join('');
    
    document.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            window.location.href = `movie.html?id=${card.dataset.id}`;
        });
    });
}

function createMovieCard(movie) {
    const poster = getHighResPoster(movie.poster_link, 300);
    const rating = movie.imdb_rating ? movie.imdb_rating.toFixed(1) : '?';
    const year = movie.year || 'Unknown';
    
    return `
        <div class="movie-card bg-white rounded-xl shadow-md overflow-hidden cursor-pointer transition hover:shadow-xl" data-id="${movie.movie_id}">
            <div class="relative pb-[140%] bg-gray-200">
                <img src="${poster}" alt="${movie.title}" 
                     class="absolute w-full h-full object-cover" 
                     loading="lazy"
                     referrerpolicy="no-referrer"
                     onerror="this.onerror=null; this.src=getRandomPlaceholder();">
                <div class="absolute top-2 right-2 bg-black/70 text-yellow-400 font-bold px-2 py-1 rounded-lg text-sm">
                    <i class="fas fa-star mr-1 text-xs"></i>${rating}
                </div>
            </div>
            <div class="p-4">
                <h3 class="font-bold text-gray-800 truncate">${movie.title}</h3>
                <p class="text-gray-500 text-sm">${year} · ${movie.runtime || '?'} min</p>
            </div>
        </div>
    `;
}