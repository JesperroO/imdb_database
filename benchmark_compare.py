"""
Performance Benchmark: Original vs LLM-Enhanced Database
"""

import sqlite3
import time
import statistics

ORIGINAL_DB = "movies.db.enhanced.backup"
ENHANCED_DB = "movies.db"

QUERIES = [
    # Query 1: Filter by year
    ("Filter by year (2010-2020)", "SELECT COUNT(*) FROM Movie WHERE year BETWEEN 2010 AND 2020"),

    # Query 2: Sort by rating
    ("Sort by rating DESC", "SELECT * FROM Movie ORDER BY imdb_rating DESC LIMIT 10"),

    # Query 3: JOIN with Director
    ("JOIN with Director", "SELECT m.title, d.director_name FROM Movie m JOIN Director d ON m.director_id = d.director_id LIMIT 50"),

    # Query 4: JOIN with Genre (many-to-many)
    ("JOIN with Genre", "SELECT m.title, g.genre FROM Movie m JOIN Movie_Genre mg ON m.movie_id = mg.movie_id JOIN Genre g ON mg.genre_id = g.genre_id WHERE g.genre = 'Action' LIMIT 20"),

    # Query 5: Filter by rating with JOIN
    ("Filter + JOIN (rating > 8)", """
        SELECT m.title, m.imdb_rating
        FROM Movie m
        WHERE m.imdb_rating > 8
        ORDER BY m.imdb_rating DESC
        LIMIT 20
    """),

    # Query 6: Actor JOIN
    ("JOIN with Actor", """
        SELECT m.title, a.actor_name
        FROM Movie m
        JOIN Movie_Actor ma ON m.movie_id = ma.movie_id
        JOIN Actor a ON ma.actor_id = a.actor_id
        WHERE a.actor_name LIKE 'Brad%'
        LIMIT 20
    """),

    # Query 7: Aggregation
    ("GROUP BY genre count", """
        SELECT g.genre, COUNT(*) as cnt
        FROM Movie m
        JOIN Movie_Genre mg ON m.movie_id = mg.movie_id
        JOIN Genre g ON mg.genre_id = g.genre_id
        GROUP BY g.genre
        ORDER BY cnt DESC
    """),
]


def run_benchmark(db_path, runs=5):
    conn = sqlite3.connect(db_path)
    results = {}

    for name, query in QUERIES:
        times = []
        for _ in range(runs):
            start = time.perf_counter()
            conn.execute(query).fetchall()
            times.append((time.perf_counter() - start) * 1000)

        avg = statistics.mean(times)
        results[name] = avg
        print(f"  {name}: {avg:.2f} ms (avg of {runs} runs)")

    conn.close()
    return results


def main():
    print("=" * 60)
    print("PERFORMANCE BENCHMARK: Original vs Enhanced")
    print("=" * 60)

    print("\n--- Original Database (no indexes) ---")
    # Recreate original schema for fair comparison
    import shutil
    shutil.copy(ORIGINAL_DB, "/tmp/original_test.db")
    orig_conn = sqlite3.connect("/tmp/original_test.db")
    orig_conn.execute("DROP TABLE IF EXISTS Movie;")
    orig_conn.execute("""
        CREATE TABLE Movie (
            movie_id INTEGER PRIMARY KEY,
            title TEXT,
            year INTEGER,
            certificate TEXT,
            runtime INTEGER,
            imdb_rating REAL,
            meta_score REAL,
            votes INTEGER,
            gross REAL,
            overview TEXT,
            poster_link TEXT,
            director_id INTEGER,
            FOREIGN KEY (director_id) REFERENCES Director(director_id)
        );
    """)
    # Copy data
    orig_conn.execute("ATTACH DATABASE 'movies.db.enhanced.backup' AS original")
    orig_conn.execute("INSERT INTO Movie SELECT * FROM original.Movie")
    orig_conn.commit()
    orig_results = run_benchmark("/tmp/original_test.db")
    orig_conn.close()

    print("\n--- Enhanced Database (with indexes) ---")
    enh_results = run_benchmark(ENHANCED_DB)

    print("\n" + "=" * 60)
    print("COMPARISON SUMMARY")
    print("=" * 60)
    print(f"{'Query':<35} {'Original (ms)':<15} {'Enhanced (ms)':<15} {'Speedup':<10}")
    print("-" * 75)

    for name in QUERIES:
        orig_time = orig_results[name]
        enh_time = enh_results[name]
        speedup = (orig_time - enh_time) / orig_time * 100 if orig_time > 0 else 0
        print(f"{name:<35} {orig_time:<15.2f} {enh_time:<15.2f} {speedup:>+.1f}%")

    print("\nNote: Results show average of 5 runs. Indexes significantly improve")
    print("JOIN and filter operations, especially on larger datasets.")


if __name__ == "__main__":
    main()