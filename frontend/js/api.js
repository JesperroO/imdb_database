// API 基础配置
const API_BASE = 'http://127.0.0.1:7777/api';

// 通用 GET 请求封装
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
        console.error('API 请求失败:', error);
        throw error;
    }
}

// 1. 获取电影列表
async function getMovies(limit = 100, offset = 0) {
    return await fetchAPI('/movies', { limit, offset });
}

// 2. 获取单部电影详情
async function getMovieDetail(movieId) {
    return await fetchAPI(`/movies/${movieId}`);
}

// 3. 按类型筛选电影
async function getMoviesByGenre(genre) {
    return await fetchAPI(`/movies/genre/${encodeURIComponent(genre)}`);
}

// 4. 获取导演的电影
async function getDirectorMovies(directorId) {
    return await fetchAPI(`/movies/director/${directorId}`);
}

// 5. 获取类型统计（电影数量）
async function getGenreStats() {
    return await fetchAPI('/stats/genres');
}

// 6. 获取 Top N 电影
async function getTopMovies(topN = 10) {
    return await fetchAPI('/movies/top', { top_n: topN });
}

// 7. 获取类型平均评分统计
async function getGenreRatingStats() {
    return await fetchAPI('/stats/genres/rating');
}

// 8. 获取演员详情及电影
async function getActorMovies(actorId) {
    return await fetchAPI(`/stats/actors/${actorId}`);
}

// ========== 工具函数 ==========

// 将 IMDb 缩略图 URL 转换为高清大图
function getHighResPoster(url, width = 300) {
    if (!url || typeof url !== 'string') return getRandomPlaceholder();
    return url.replace(/\._V1_UX\d+_CR\d+,\d+,\d+,\d+_AL_\.jpg$/i, `._V1_UX${width}_.jpg`);
}

// 备用占位图列表（请确保这些图片存在于 assets 文件夹中）
const PLACEHOLDER_IMAGES = [
    'assets/placeholder1.jpg',
    'assets/placeholder2.jpg',
    'assets/placeholder3.jpg',
    'assets/placeholder4.jpg',
    'assets/placeholder5.jpg'
];

// 随机获取一张占位图
function getRandomPlaceholder() {
    const randomIndex = Math.floor(Math.random() * PLACEHOLDER_IMAGES.length);
    return PLACEHOLDER_IMAGES[randomIndex];
}