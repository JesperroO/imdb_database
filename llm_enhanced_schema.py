"""
LLM-Enhanced Database Schema
==============================
This script enhances the original database with:
1. Data integrity constraints (CHECK, NOT NULL)
2. Indexes for efficient access

Original schema → Enhanced schema comparison is documented below.

Before running this script, backup your database:
    cp movies.db movies.db.backup
"""

import sqlite3
import os

DB_PATH = "movies.db"
BACKUP_PATH = "movies.db.enhanced.backup"


def create_enhanced_schema(conn: sqlite3.Connection):
    """Create enhanced schema with constraints and indexes."""

    cursor = conn.cursor()

    print("=" * 60)
    print("LLM-ENHANCED DATABASE SCHEMA")
    print("=" * 60)

    # Step 1: Create new tables with constraints
    print("\n[1] Creating tables with integrity constraints...")

    cursor.executescript("""
        -- Drop existing tables
        DROP TABLE IF EXISTS Movie_Genre;
        DROP TABLE IF EXISTS Movie_Actor;
        DROP TABLE IF EXISTS Movie;
        DROP TABLE IF EXISTS Genre;
        DROP TABLE IF EXISTS Actor;
        DROP TABLE IF EXISTS Director;

        -- Enhanced Director table: NOT NULL + UNIQUE constraint on name
        CREATE TABLE Director (
            director_id INTEGER PRIMARY KEY,
            director_name TEXT NOT NULL UNIQUE
        );

        -- Enhanced Actor table: NOT NULL constraint
        CREATE TABLE Actor (
            actor_id INTEGER PRIMARY KEY,
            actor_name TEXT NOT NULL
        );

        -- Enhanced Genre table: NOT NULL + UNIQUE constraint
        CREATE TABLE Genre (
            genre_id INTEGER PRIMARY KEY,
            genre TEXT NOT NULL UNIQUE
        );

        -- Enhanced Movie table: CHECK constraints for data integrity
        CREATE TABLE Movie (
            movie_id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            year INTEGER NOT NULL CHECK (year >= 1888 AND year <= 2026),
            certificate TEXT,
            runtime INTEGER NOT NULL CHECK (runtime > 0),
            imdb_rating REAL CHECK (imdb_rating >= 0 AND imdb_rating <= 10),
            meta_score REAL CHECK (meta_score IS NULL OR (meta_score >= 0 AND meta_score <= 100)),
            votes INTEGER NOT NULL CHECK (votes >= 0),
            gross REAL CHECK (gross IS NULL OR gross >= 0),
            overview TEXT,
            poster_link TEXT,
            director_id INTEGER,
            FOREIGN KEY (director_id) REFERENCES Director(director_id)
        );

        -- Movie_Actor relationship table
        CREATE TABLE Movie_Actor (
            movie_id INTEGER NOT NULL,
            actor_id INTEGER NOT NULL,
            PRIMARY KEY (movie_id, actor_id),
            FOREIGN KEY (movie_id) REFERENCES Movie(movie_id) ON DELETE CASCADE,
            FOREIGN KEY (actor_id) REFERENCES Actor(actor_id) ON DELETE CASCADE
        );

        -- Movie_Genre relationship table
        CREATE TABLE Movie_Genre (
            movie_id INTEGER NOT NULL,
            genre_id INTEGER NOT NULL,
            PRIMARY KEY (movie_id, genre_id),
            FOREIGN KEY (movie_id) REFERENCES Movie(movie_id) ON DELETE CASCADE,
            FOREIGN KEY (genre_id) REFERENCES Genre(genre_id) ON DELETE CASCADE
        );
    """)

    print("   ✓ Tables created with CHECK and NOT NULL constraints")

    # Step 2: Copy data from backup
    print("\n[2] Copying data from backup database...")

    backup_conn = sqlite3.connect(BACKUP_PATH)
    backup_cursor = backup_conn.cursor()

    # Copy Director
    backup_cursor.execute("SELECT director_id, director_name FROM Director")
    for row in backup_cursor.fetchall():
        try:
            cursor.execute("INSERT INTO Director VALUES (?, ?)", row)
        except sqlite3.IntegrityError as e:
            print(f"   ! Skipped director {row[1]}: {e}")

    # Copy Actor
    backup_cursor.execute("SELECT actor_id, actor_name FROM Actor")
    for row in backup_cursor.fetchall():
        cursor.execute("INSERT INTO Actor VALUES (?, ?)", row)

    # Copy Genre
    backup_cursor.execute("SELECT genre_id, genre FROM Genre")
    for row in backup_cursor.fetchall():
        try:
            cursor.execute("INSERT INTO Genre VALUES (?, ?)", row)
        except sqlite3.IntegrityError as e:
            print(f"   ! Skipped genre {row[1]}: {e}")

    # Copy Movie (filter out invalid data based on constraints)
    backup_cursor.execute("""
        SELECT movie_id, title, year, certificate, runtime, imdb_rating,
               meta_score, votes, gross, overview, poster_link, director_id
        FROM Movie
        WHERE title IS NOT NULL
          AND year IS NOT NULL AND year >= 1888 AND year <= 2026
          AND runtime IS NOT NULL AND runtime > 0
          AND votes IS NOT NULL AND votes >= 0
          AND (imdb_rating IS NULL OR (imdb_rating >= 0 AND imdb_rating <= 10))
          AND (gross IS NULL OR gross >= 0)
    """)
    for row in backup_cursor.fetchall():
        try:
            cursor.execute("INSERT INTO Movie VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", row)
        except sqlite3.IntegrityError as e:
            print(f"   ! Skipped movie {row[1]}: {e}")

    # Copy Movie_Actor
    backup_cursor.execute("SELECT movie_id, actor_id FROM Movie_Actor")
    for row in backup_cursor.fetchall():
        try:
            cursor.execute("INSERT INTO Movie_Actor VALUES (?, ?)", row)
        except sqlite3.IntegrityError:
            pass  # Skip if movie or actor doesn't exist

    # Copy Movie_Genre
    backup_cursor.execute("SELECT movie_id, genre_id FROM Movie_Genre")
    for row in backup_cursor.fetchall():
        try:
            cursor.execute("INSERT INTO Movie_Genre VALUES (?, ?)", row)
        except sqlite3.IntegrityError:
            pass  # Skip if movie or genre doesn't exist

    backup_conn.close()
    conn.commit()
    print("   ✓ Data copied successfully")

    # Step 3: Create indexes for efficient access
    print("\n[3] Creating indexes for efficient data access...")

    cursor.executescript("""
        -- Indexes for Movie table: filtering and sorting
        CREATE INDEX idx_movie_year ON Movie(year);
        CREATE INDEX idx_movie_rating ON Movie(imdb_rating DESC);
        CREATE INDEX idx_movie_director ON Movie(director_id);
        CREATE INDEX idx_movie_title ON Movie(title);
        CREATE INDEX idx_movie_votes ON Movie(votes DESC);

        -- Indexes for Movie_Actor: JOIN optimization
        CREATE INDEX idx_ma_movie ON Movie_Actor(movie_id);
        CREATE INDEX idx_ma_actor ON Movie_Actor(actor_id);

        -- Indexes for Movie_Genre: JOIN optimization
        CREATE INDEX idx_mg_movie ON Movie_Genre(movie_id);
        CREATE INDEX idx_mg_genre ON Movie_Genre(genre_id);

        -- Index for Director name lookup
        CREATE INDEX idx_director_name ON Director(director_name);

        -- Index for Actor name lookup
        CREATE INDEX idx_actor_name ON Actor(actor_name);
    """)

    print("   ✓ Created 13 indexes")
    conn.commit()

    # Step 4: Verify
    print("\n[4] Verifying enhanced database...")

    cursor.execute("SELECT COUNT(*) FROM Movie")
    movie_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM Director")
    director_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM Actor")
    actor_count = cursor.fetchone()[0]

    # Count indexes
    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
    index_count = cursor.fetchone()[0]

    print(f"   Movies: {movie_count}")
    print(f"   Directors: {director_count}")
    print(f"   Actors: {actor_count}")
    print(f"   Indexes: {index_count}")


def main():
    # Check if backup exists
    if not os.path.exists(BACKUP_PATH):
        print(f"Error: Backup file '{BACKUP_PATH}' not found.")
        print("Please run: cp movies.db movies.db.enhanced.backup")
        return

    # Connect to database
    conn = sqlite3.connect(DB_PATH)

    try:
        create_enhanced_schema(conn)
        print("\n" + "=" * 60)
        print("ENHANCEMENT COMPLETE!")
        print("=" * 60)
        print("\nEnhanced database saved to:", DB_PATH)
        print("Backup original at:", BACKUP_PATH)

    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    main()