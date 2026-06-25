-- ============================================================
-- backfill_fiction_vibes.sql
-- Backfills vibe, plot_type, length_category for all fiction books
-- so the Fiction Finder questionnaire actually returns results.
-- Run this once in the Supabase SQL editor.
-- ============================================================

-- ── SCIENCE FICTION ──────────────────────────────────────────
UPDATE books SET vibe = 'Adventurous', plot_type = 'Epic Quest',       length_category = 'Epic'       WHERE title = 'Dune';
UPDATE books SET vibe = 'Thrilling',   plot_type = 'Survival',         length_category = 'Standard'   WHERE title = 'The Martian';
UPDATE books SET vibe = 'Mind-Bending',plot_type = 'Political Intrigue',length_category = 'Standard'   WHERE title = 'Foundation';
UPDATE books SET vibe = 'Thrilling',   plot_type = 'Coming-of-Age',    length_category = 'Standard'   WHERE title = 'Ender''s Game';
UPDATE books SET vibe = 'Adventurous', plot_type = 'Epic Quest',       length_category = 'Standard'   WHERE title = 'Project Hail Mary';
UPDATE books SET vibe = 'Dark',        plot_type = 'Dystopia',         length_category = 'Quick Read' WHERE title = 'Neuromancer';

-- ── FANTASY ──────────────────────────────────────────────────
UPDATE books SET vibe = 'Adventurous', plot_type = 'Coming-of-Age',    length_category = 'Epic'       WHERE title = 'The Name of the Wind';
UPDATE books SET vibe = 'Dark',        plot_type = 'Political Intrigue',length_category = 'Epic'       WHERE title = 'A Game of Thrones';
UPDATE books SET vibe = 'Adventurous', plot_type = 'Epic Quest',       length_category = 'Standard'   WHERE title = 'The Hobbit';
UPDATE books SET vibe = 'Adventurous', plot_type = 'Epic Quest',       length_category = 'Epic'       WHERE title = 'The Way of Kings';

-- ── MYSTERY & THRILLER ───────────────────────────────────────
UPDATE books SET vibe = 'Dark',        plot_type = 'Mystery',          length_category = 'Standard'   WHERE title = 'Gone Girl';
UPDATE books SET vibe = 'Thrilling',   plot_type = 'Mystery',          length_category = 'Quick Read' WHERE title = 'And Then There Were None';
UPDATE books SET vibe = 'Dark',        plot_type = 'Mystery',          length_category = 'Epic'       WHERE title = 'The Girl with the Dragon Tattoo';
UPDATE books SET vibe = 'Dark',        plot_type = 'Mystery',          length_category = 'Standard'   WHERE title = 'Big Little Lies';

-- ── COMEDY & HUMOR ────────────────────────────────────────────
UPDATE books SET vibe = 'Funny',       plot_type = 'Absurdist Adventure', length_category = 'Quick Read' WHERE title = 'The Hitchhiker''s Guide to the Galaxy';
UPDATE books SET vibe = 'Funny',       plot_type = 'Comedy',           length_category = 'Standard'   WHERE title = 'Good Omens';
UPDATE books SET vibe = 'Funny',       plot_type = 'Satire',           length_category = 'Epic'       WHERE title = 'Catch-22';
UPDATE books SET vibe = 'Cozy',        plot_type = 'Comedy',           length_category = 'Quick Read' WHERE title = 'Three Men in a Boat';
UPDATE books SET vibe = 'Funny',       plot_type = 'Comedy',           length_category = 'Quick Read' WHERE title = 'Bossypants';
UPDATE books SET vibe = 'Funny',       plot_type = 'Romance',          length_category = 'Standard'   WHERE title = 'The Rosie Project';

-- ── LITERARY FICTION ──────────────────────────────────────────
UPDATE books SET vibe = 'Dark',        plot_type = 'Dystopia',         length_category = 'Standard'   WHERE title = '1984';
UPDATE books SET vibe = 'Thrilling',   plot_type = 'Coming-of-Age',    length_category = 'Standard'   WHERE title = 'To Kill a Mockingbird';
UPDATE books SET vibe = 'Atmospheric', plot_type = 'Tragedy',          length_category = 'Quick Read' WHERE title = 'The Great Gatsby';
UPDATE books SET vibe = 'Mind-Bending',plot_type = 'Dystopia',         length_category = 'Standard'   WHERE title = 'Brave New World';

-- ── ROMANCE (if any exist) ────────────────────────────────────
UPDATE books SET vibe = 'Romantic',    plot_type = 'Romance',          length_category = 'Standard'
  WHERE genre_id IN (SELECT id FROM genres WHERE slug = 'romance') AND vibe IS NULL;

-- ── HORROR (if any exist) ─────────────────────────────────────
UPDATE books SET vibe = 'Dark',        plot_type = 'Horror',           length_category = 'Standard'
  WHERE genre_id IN (SELECT id FROM genres WHERE slug = 'horror') AND vibe IS NULL;

-- ── HISTORICAL FICTION (if any exist) ─────────────────────────
UPDATE books SET vibe = 'Atmospheric', plot_type = 'Historical Drama', length_category = 'Standard'
  WHERE genre_id IN (SELECT id FROM genres WHERE slug = 'historical-fiction') AND vibe IS NULL;
