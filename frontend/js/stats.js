document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        loadGenreCountChart(),
        loadGenreRatingChart(),
        loadTopMoviesList()
    ]);
});

async function loadGenreCountChart() {
    try {
        const data = await getGenreStats();
        const labels = data.map(d => d.genre);
        const counts = data.map(d => d.movie_count);
        
        new Chart(document.getElementById('genreCountChart'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Number of Movies',
                    data: counts,
                    backgroundColor: 'rgba(79, 70, 229, 0.7)',
                    borderColor: 'rgb(79, 70, 229)',
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    } catch (error) {
        console.error('Failed to load genre count chart:', error);
        document.getElementById('genreCountChart').parentElement.innerHTML = 
            '<p class="text-red-500 text-center py-12">Failed to load chart</p>';
    }
}

async function loadGenreRatingChart() {
    try {
        const data = await getGenreRatingStats();
        const labels = data.map(d => d.genre);
        const ratings = data.map(d => d.avg_rating);
        
        new Chart(document.getElementById('genreRatingChart'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Average IMDb Rating',
                    data: ratings,
                    backgroundColor: 'rgba(245, 158, 11, 0.7)',
                    borderColor: 'rgb(245, 158, 11)',
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { min: 6, max: 9 }
                }
            }
        });
    } catch (error) {
        console.error('Failed to load genre rating chart:', error);
        document.getElementById('genreRatingChart').parentElement.innerHTML = 
            '<p class="text-red-500 text-center py-12">Failed to load chart</p>';
    }
}

async function loadTopMoviesList() {
    const container = document.getElementById('top-movies-list');
    try {
        const movies = await getTopMovies(10);
        container.innerHTML = movies.map((movie, index) => `
            <div class="flex items-center justify-between py-3 hover:bg-gray-50 px-2 rounded-lg transition">
                <div class="flex items-center space-x-4">
                    <span class="text-2xl font-bold w-8 text-gray-400">${index + 1}</span>
                    <img src="${getHighResPoster(movie.poster_link, 200)}" alt="${movie.title}" 
                         class="w-12 h-16 object-cover rounded shadow" 
                         loading="lazy"
                         referrerpolicy="no-referrer"
                         onerror="this.onerror=null; this.src=getRandomPlaceholder();">
                    <div>
                        <a href="movie.html?id=${movie.movie_id}" class="font-medium text-gray-800 hover:text-indigo-600">${movie.title}</a>
                        <p class="text-sm text-gray-500">${movie.year} · ${movie.director_name || ''}</p>
                    </div>
                </div>
                <div class="text-yellow-500 font-bold text-lg">
                    <i class="fas fa-star mr-1 text-sm"></i>${movie.imdb_rating.toFixed(1)}
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = `<p class="text-red-500 py-4">Failed to load: ${error.message}</p>`;
    }
}