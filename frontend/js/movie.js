document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');
    
    if (!movieId) {
        window.location.href = 'index.html';
        return;
    }
    
    const container = document.getElementById('movie-detail');
    container.innerHTML = `
        <div class="p-12 text-center">
            <i class="fas fa-spinner fa-spin text-4xl text-indigo-500"></i>
            <p class="mt-4 text-gray-600">Loading movie details...</p>
        </div>
    `;
    
    try {
        const movie = await getMovieDetail(movieId);
        renderMovieDetail(movie);
    } catch (error) {
        container.innerHTML = `
            <div class="p-8 text-center text-red-500">
                <i class="fas fa-exclamation-circle text-4xl mb-4"></i>
                <p>Failed to load: ${error.message}</p>
                <a href="index.html" class="mt-4 inline-block text-indigo-600 hover:underline">Back to Home</a>
            </div>
        `;
    }
});

function renderMovieDetail(movie) {
    const container = document.getElementById('movie-detail');
    const poster = getHighResPoster(movie.poster_link, 400);
    const rating = movie.imdb_rating ? movie.imdb_rating.toFixed(1) : 'N/A';
    const metaScore = movie.meta_score || 'N/A';
    const gross = movie.gross ? `$${(movie.gross / 1000000).toFixed(1)}M` : 'N/A';
    const votes = movie.votes ? formatNumber(movie.votes) : 'N/A';
    
    let actorsHtml = 'No actor information';
    if (movie.actors && movie.actors.length > 0) {
        actorsHtml = movie.actors.map(a => 
            `<a href="actor.html?id=${a.actor_id}" class="text-indigo-600 hover:underline">${a.actor_name}</a>`
        ).join(', ');
    }
    
    let genresHtml = 'No genre information';
    if (movie.genres && movie.genres.length > 0) {
        genresHtml = movie.genres.map(g => 
            `<span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">${g.genre}</span>`
        ).join('');
    }
    
    container.innerHTML = `
        <div class="md:flex">
            <div class="md:w-1/3 lg:w-1/4 bg-gray-100 flex justify-center">
                <img src="${poster}" alt="${movie.title}" 
                     class="w-full h-auto object-cover max-h-[500px]" 
                     referrerpolicy="no-referrer"
                     onerror="this.onerror=null; this.src=getRandomPlaceholder();">
            </div>
            <div class="p-6 md:w-2/3 lg:w-3/4">
                <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 class="text-3xl md:text-4xl font-bold text-gray-800">
                            ${movie.title}
                            <span class="text-2xl text-gray-500 font-normal ml-2">(${movie.year})</span>
                        </h1>
                    </div>
                    <div class="flex items-center bg-yellow-400 text-gray-900 font-bold px-4 py-2 rounded-full text-xl">
                        <i class="fas fa-star mr-2"></i>${rating}
                    </div>
                </div>
                
                <div class="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                    <span><i class="far fa-clock mr-1 text-indigo-500"></i>${movie.runtime} min</span>
                    <span><i class="fas fa-certificate mr-1 text-indigo-500"></i>${movie.certificate || 'Unrated'}</span>
                    <span><i class="fas fa-chart-line mr-1 text-indigo-500"></i>Metascore: ${metaScore}</span>
                    <span><i class="fas fa-ticket-alt mr-1 text-indigo-500"></i>Box Office: ${gross}</span>
                    <span><i class="fas fa-users mr-1 text-indigo-500"></i>${votes} votes</span>
                </div>
                
                <div class="mt-6">
                    <h2 class="text-lg font-semibold text-gray-800 mb-2">📖 Overview</h2>
                    <p class="text-gray-700 leading-relaxed">${movie.overview || 'No overview available.'}</p>
                </div>
                
                <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <h3 class="font-semibold text-gray-800"><i class="fas fa-video mr-2 text-blue-600"></i>Director</h3>
                        <a href="director.html?id=${movie.director_id}" class="text-indigo-600 hover:underline text-lg">${movie.director_name || 'Unknown'}</a>
                    </div>
                    <div>
                        <h3 class="font-semibold text-gray-800"><i class="fas fa-tags mr-2 text-green-600"></i>Genres</h3>
                        <div class="flex flex-wrap gap-2 mt-1">${genresHtml}</div>
                    </div>
                    <div class="sm:col-span-2">
                        <h3 class="font-semibold text-gray-800"><i class="fas fa-user-friends mr-2 text-purple-600"></i>Cast</h3>
                        <div class="mt-1 text-gray-700">${actorsHtml}</div>
                    </div>
                </div>
                
                <div class="mt-8 pt-4 border-t">
                    <a href="index.html" class="text-indigo-600 hover:text-indigo-800">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Movie List
                    </a>
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