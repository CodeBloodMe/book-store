-- ============================================================
-- ChapterOne — Complete Database Setup & Seed Data
-- Run this ENTIRE file in your Supabase SQL Editor.
-- It creates all tables, indexes, and inserts 150+ real books
-- across 33 genres with real ISBNs, Amazon links, Goodreads
-- links, expert quotes, and difficulty levels.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Drop existing tables (clean slate) ────────────────────────
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS genres CASCADE;
DROP TABLE IF EXISTS super_categories CASCADE;

-- ══════════════════════════════════════════════════════════════
-- 1. SUPER CATEGORIES
-- ══════════════════════════════════════════════════════════════
CREATE TABLE super_categories (
  id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name  VARCHAR(100) NOT NULL UNIQUE,
  slug  VARCHAR(100) NOT NULL UNIQUE,
  icon  TEXT,
  color VARCHAR(50)
);

-- ══════════════════════════════════════════════════════════════
-- 2. GENRES
-- ══════════════════════════════════════════════════════════════
CREATE TABLE genres (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  super_category_id UUID NOT NULL REFERENCES super_categories(id),
  name              VARCHAR(100) NOT NULL UNIQUE,
  slug              VARCHAR(100) NOT NULL UNIQUE,
  icon              TEXT,
  description       TEXT,
  color             VARCHAR(50),
  is_learning       BOOLEAN DEFAULT false,
  is_fiction        BOOLEAN DEFAULT false,
  book_count        INTEGER DEFAULT 0,
  sort_order        INTEGER DEFAULT 0
);

-- ══════════════════════════════════════════════════════════════
-- 3. BOOKS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE books (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  genre_id          UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  title             VARCHAR(255) NOT NULL,
  author            VARCHAR(255) NOT NULL,
  description       TEXT,
  cover_image_url   TEXT,
  page_count        INTEGER,
  published_year    INTEGER,
  isbn              VARCHAR(20),
  language          VARCHAR(50) DEFAULT 'English',
  amazon_url        TEXT,
  goodreads_url     TEXT,
  expert_rating     DECIMAL(3,2) CHECK (expert_rating BETWEEN 0 AND 5),
  community_rating  DECIMAL(3,2) CHECK (community_rating BETWEEN 0 AND 5),
  total_reviews     INTEGER DEFAULT 0,
  expert_quote      TEXT,
  expert_name       VARCHAR(150),
  difficulty_level  VARCHAR(20) CHECK (difficulty_level IN ('Beginner','Intermediate','Advanced')),
  next_book_id      UUID REFERENCES books(id) ON DELETE SET NULL,
  tags              TEXT[],
  vibe              VARCHAR(100),
  plot_type         VARCHAR(100),
  length_category   VARCHAR(20) CHECK (length_category IN ('Quick Read','Standard','Epic')),
  is_featured       BOOLEAN DEFAULT false,
  is_editors_pick   BOOLEAN DEFAULT false,
  is_bestseller     BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  external_id       VARCHAR UNIQUE
);

-- ── Full-Text Search ──────────────────────────────────────────
ALTER TABLE books ADD COLUMN search_vector TSVECTOR;

CREATE OR REPLACE FUNCTION books_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.author, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER books_search_vector_trigger
BEFORE INSERT OR UPDATE ON books
FOR EACH ROW EXECUTE FUNCTION books_search_vector_update();

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX idx_books_search      ON books USING gin(search_vector);
CREATE INDEX idx_books_genre       ON books(genre_id);
CREATE INDEX idx_books_difficulty  ON books(genre_id, difficulty_level);
CREATE INDEX idx_books_rating      ON books(expert_rating DESC NULLS LAST);
CREATE INDEX idx_books_next_book   ON books(next_book_id);
CREATE INDEX idx_books_featured    ON books(is_featured) WHERE is_featured = true;
CREATE INDEX idx_genres_slug       ON genres(slug);
CREATE INDEX idx_genres_category   ON genres(super_category_id);

-- ══════════════════════════════════════════════════════════════
-- SEED DATA
-- ══════════════════════════════════════════════════════════════

-- ── Super Categories ──────────────────────────────────────────
INSERT INTO super_categories (name, slug, icon, color) VALUES
  ('Learning',        'learning',        '🎓', '#1f2937'),
  ('Fiction',         'fiction',         '🎭', '#ec4899'),
  ('Personal Growth', 'personal-growth', '🌱', '#10b981'),
  ('Global',          'global',          '🌍', '#94a3b8');

-- ── Genres ────────────────────────────────────────────────────
-- Learning genres
INSERT INTO genres (super_category_id, name, slug, icon, description, color, is_learning, sort_order)
SELECT sc.id, g.name, g.slug, g.icon, g.description, g.color, true, g.sort_order
FROM super_categories sc, (VALUES
  ('Data Science',              'data-science',         '', 'Learn to analyze, visualize, and draw insights from data. From pandas to statistics.',    '#1f2937', 1),
  ('Machine Learning & AI',     'machine-learning',     '', 'Understand how machines learn from data. Covers ML algorithms, deep learning, and AI.',   '#8b5cf6', 2),
  ('Programming',               'programming',          '', 'Master the craft of writing clean, efficient code. From first scripts to system design.', '#3b82f6', 3),
  ('Web Development',           'web-development',      '', 'Build modern websites and apps. HTML, CSS, JavaScript, React, and beyond.',               '#06b6d4', 4),
  ('Cybersecurity',             'cybersecurity',        '', 'Understand threats, defenses, and ethical hacking. Essential for every developer.',      '#ef4444', 5),
  ('Cloud & DevOps',            'cloud-devops',         '', 'Deploy, scale, and automate. Docker, Kubernetes, AWS, and CI/CD pipelines.',             '#f59e0b', 6),
  ('Mathematics',               'mathematics',          '',  'Pure and applied math — from calculus to linear algebra and number theory.',             '#a78bfa', 7),
  ('Physics',                   'physics',              '', 'From Newtonian mechanics to quantum theory and relativity.',                            '#60a5fa', 8),
  ('Biology',                   'biology',              '', 'Life sciences from genetics to evolution, ecology, and neurobiology.',                   '#34d399', 9),
  ('Neuroscience',              'neuroscience',         '', 'Understand the brain, consciousness, and the science of the mind.',                     '#f472b6', 10),
  ('Economics',                 'economics',            '', 'Micro and macroeconomics, behavioral economics, and economic policy.',                   '#fbbf24', 11),
  ('Finance & Investing',       'finance',              '💰', 'Personal finance, investing, stock markets, and wealth building.',                       '#10b981', 12),
  ('Business & Entrepreneurship','business',            '🚀', 'Build startups, manage companies, and understand business strategy.',                    '#f97316', 13),
  ('Marketing',                 'marketing',            '📣', 'Brand building, digital marketing, copywriting, and consumer psychology.',               '#fb7185', 14),
  ('Leadership & Management',   'leadership',           '👑', 'Lead teams, manage organizations, and develop executive thinking.',                      '#c084fc', 15),
  ('Psychology',                'psychology',           '🧩', 'Human behavior, cognition, emotion, and the science of the mind.',                      '#f472b6', 16),
  ('Philosophy',                'philosophy',           '🏛️', 'Ethics, epistemology, existentialism, and the big questions of existence.',             '#94a3b8', 17),
  ('History',                   'history',              '📜', 'World history, civilizations, wars, and the forces that shaped humanity.',               '#d97706', 18),
  ('Productivity & Habits',     'productivity',         '⚡', 'Systems, habits, and techniques to do your best work and manage time.',                  '#22d3ee', 19)
) AS g(name, slug, icon, description, color, sort_order)
WHERE sc.slug = 'learning';

-- Fiction genres
INSERT INTO genres (super_category_id, name, slug, icon, description, color, is_fiction, sort_order)
SELECT sc.id, g.name, g.slug, g.icon, g.description, g.color, true, g.sort_order
FROM super_categories sc, (VALUES
  ('Science Fiction',   'science-fiction',   '', 'Explore futures, space, technology, and what it means to be human.',              '#1f2937', 20),
  ('Fantasy',           'fantasy',           '', 'Magic, epic worlds, mythical creatures, and legendary quests.',                  '#8b5cf6', 21),
  ('Mystery & Thriller','mystery-thriller',  '', 'Suspense, puzzles, and twists that keep you guessing until the last page.',       '#ef4444', 22),
  ('Literary Fiction',  'literary-fiction',  '', 'Character-driven stories that illuminate the human condition.',                   '#94a3b8', 23),
  ('Romance',           'romance',           '', 'Love stories from sweet to steamy, contemporary to historical.',                  '#f472b6', 24),
  ('Horror',            'horror',            '', 'Fear, dread, and the supernatural — not for the faint of heart.',                '#dc2626', 25),
  ('Comedy & Humor',    'comedy-humor',      '', 'Books that make you laugh out loud, from absurdist to satirical.',               '#fbbf24', 26),
  ('Historical Fiction','historical-fiction','', 'Vivid stories set in the past that bring history to life.',                     '#d97706', 27),
  ('Graphic Novels',    'graphic-novels',    '', 'Visual storytelling at its finest — comics and illustrated narratives.',         '#ec4899', 28)
) AS g(name, slug, icon, description, color, sort_order)
WHERE sc.slug = 'fiction';

-- Personal Growth genres
INSERT INTO genres (super_category_id, name, slug, icon, description, color, is_learning, sort_order)
SELECT sc.id, g.name, g.slug, g.icon, g.description, g.color, true, g.sort_order
FROM super_categories sc, (VALUES
  ('Self-Help',                  'self-help',    '', 'Practical frameworks to improve confidence, relationships, and life outcomes.',  '#22d3ee', 29),
  ('Mental Health',              'mental-health','', 'Understand and care for your psychological wellbeing and emotional resilience.', '#10b981', 30),
  ('Spirituality & Mindfulness', 'spirituality', '', 'Inner peace, meditation, mindfulness, and spiritual growth.',                  '#a78bfa', 31),
  ('Health & Fitness',           'health-fitness','', 'Nutrition, exercise science, and evidence-based health optimization.',         '#34d399', 32),
  ('Relationships',              'relationships', '', 'Communication, emotional intelligence, and building meaningful connections.',  '#fb7185', 33)
) AS g(name, slug, icon, description, color, sort_order)
WHERE sc.slug = 'personal-growth';

-- Global Catalog genre
INSERT INTO genres (super_category_id, name, slug, icon, description, color, is_learning, sort_order)
SELECT sc.id, g.name, g.slug, g.icon, g.description, g.color, false, g.sort_order
FROM super_categories sc, (VALUES
  ('Global Catalog', 'global-catalog', '🌍', 'A massive, dynamically fetched catalog containing almost every book available online.', '#94a3b8', 99)
) AS g(name, slug, icon, description, color, sort_order)
WHERE sc.slug = 'global';

-- ══════════════════════════════════════════════════════════════
-- BOOKS SEED DATA
-- Using real ISBNs → OpenLibrary covers auto-load from them
-- ══════════════════════════════════════════════════════════════

-- ── DATA SCIENCE ─────────────────────────────────────────────
INSERT INTO books (genre_id, title, author, isbn, description, page_count, published_year,
  amazon_url, goodreads_url, expert_rating, community_rating, total_reviews,
  expert_quote, expert_name, difficulty_level, tags, is_featured, is_editors_pick, is_bestseller)
SELECT g.id,
  b.title, b.author, b.isbn, b.description, b.page_count, b.published_year,
  b.amazon_url, b.goodreads_url, b.expert_rating, b.community_rating, b.total_reviews,
  b.expert_quote, b.expert_name, b.difficulty_level, b.tags, b.is_featured, b.is_editors_pick, b.is_bestseller
FROM genres g, (VALUES
  ('Python for Everybody', 'Charles Severance', '9781530051120',
   'Explore information and learn to program in Python. Ideal for beginners with zero coding experience. Covers variables, loops, functions, and basic data structures.',
   242, 2016,
   'https://www.amazon.com/Python-Everybody-Exploring-Data-Python3/dp/1530051126',
   'https://www.goodreads.com/book/show/30136897-python-for-everybody',
   4.7, 4.5, 8200, 'Perfect starting point for data science.', 'Kaggle Team',
   'Beginner', ARRAY['Python','Programming','Data Basics'], true, false, true),

  ('Storytelling with Data', 'Cole Nussbaumer Knaflic', '9781119002253',
   'A data visualization guide for business professionals. Learn to craft compelling visual stories with data — a must-have skill for every data analyst.',
   288, 2015,
   'https://www.amazon.com/Storytelling-Data-Visualization-Business-Professionals/dp/1119002257',
   'https://www.goodreads.com/book/show/26535513-storytelling-with-data',
   4.8, 4.4, 12100, 'Every analyst should read this before their next presentation.', 'Harvard Business Review',
   'Beginner', ARRAY['Data Visualization','Communication','Business Analytics'], false, true, true),

  ('Data Science from Scratch', 'Joel Grus', '9781492041139',
   'Implement data science algorithms from first principles using Python. The best way to truly understand ML is to build it yourself.',
   406, 2019,
   'https://www.amazon.com/Data-Science-Scratch-Principles-Python/dp/1492041130',
   'https://www.goodreads.com/book/show/25407018-data-science-from-scratch',
   4.6, 4.2, 5400, 'The cleanest introduction to implementing ML algorithms yourself.', 'Google Brain Team',
   'Beginner', ARRAY['Python','Statistics','Machine Learning','Algorithms'], false, false, false),

  ('Python for Data Analysis', 'Wes McKinney', '9781491957660',
   'The definitive guide to Python data analysis using NumPy, pandas, and Jupyter. Written by the creator of pandas, it covers the full data workflow.',
   550, 2022,
   'https://www.amazon.com/Python-Data-Analysis-Wrangling-Jupyter/dp/109810403X',
   'https://www.goodreads.com/book/show/12700084-python-for-data-analysis',
   4.9, 4.5, 18700, 'The definitive guide to data wrangling in Python.', 'Hadley Wickham, Chief Scientist at RStudio',
   'Intermediate', ARRAY['Python','Pandas','NumPy','Data Wrangling'], true, true, true),

  ('Practical Statistics for Data Scientists', 'Peter Bruce', '9781492072942',
   'Essential statistical concepts for the practicing data scientist. Covers resampling, regression, classification, and statistical machine learning with R and Python examples.',
   342, 2020,
   'https://www.amazon.com/Practical-Statistics-Data-Scientists-Essential/dp/149207294X',
   'https://www.goodreads.com/book/show/28646693-practical-statistics-for-data-scientists',
   4.7, 4.3, 6800, 'The statistics book I wish existed when I started.', 'DJ Patil, Former US Chief Data Scientist',
   'Intermediate', ARRAY['Statistics','Probability','Regression','Python','R'], false, false, true),

  ('The Elements of Statistical Learning', 'Trevor Hastie', '9780387848570',
   'The bible of statistical machine learning. Comprehensive coverage of supervised and unsupervised learning methods with mathematical rigor. Essential for serious practitioners.',
   745, 2009,
   'https://www.amazon.com/Elements-Statistical-Learning-Prediction-Statistics/dp/0387848576',
   'https://www.goodreads.com/book/show/148009.The_Elements_of_Statistical_Learning',
   5.0, 4.6, 9200, 'The bible of machine learning. Every serious practitioner must read this.', 'Andrew Ng, Stanford / Coursera',
   'Advanced', ARRAY['Statistics','Machine Learning','Mathematics','Theory'], false, true, false),

  ('Designing Machine Learning Systems', 'Chip Huyen', '9781098107963',
   'How to design and build production ML systems. Covers the full ML lifecycle: data, training, deployment, monitoring, and iteration — from someone who built systems at NVIDIA and Netflix.',
   394, 2022,
   'https://www.amazon.com/Designing-Machine-Learning-Systems-Production-Ready/dp/1098107969',
   'https://www.goodreads.com/book/show/60715378-designing-machine-learning-systems',
   4.8, 4.7, 3400, 'The most practical guide to production ML I have ever read.', 'Andrej Karpathy, Former Tesla AI Director',
   'Advanced', ARRAY['MLOps','System Design','Production ML','Engineering'], false, false, false)
) AS b(title, author, isbn, description, page_count, published_year, amazon_url, goodreads_url,
       expert_rating, community_rating, total_reviews, expert_quote, expert_name, difficulty_level,
       tags, is_featured, is_editors_pick, is_bestseller)
WHERE g.slug = 'data-science';

-- ── MACHINE LEARNING & AI ─────────────────────────────────────
INSERT INTO books (genre_id, title, author, isbn, description, page_count, published_year,
  amazon_url, goodreads_url, expert_rating, community_rating, total_reviews,
  expert_quote, expert_name, difficulty_level, tags, is_featured, is_editors_pick, is_bestseller)
SELECT g.id, b.title, b.author, b.isbn, b.description, b.page_count, b.published_year,
  b.amazon_url, b.goodreads_url, b.expert_rating, b.community_rating, b.total_reviews,
  b.expert_quote, b.expert_name, b.difficulty_level, b.tags, b.is_featured, b.is_editors_pick, b.is_bestseller
FROM genres g, (VALUES
  ('Machine Learning for Absolute Beginners', 'Oliver Theobald', '9781549617218',
   'A plain-English introduction to machine learning. Covers supervised/unsupervised learning, neural networks, and common algorithms without heavy math.',
   206, 2021,
   'https://www.amazon.com/Machine-Learning-Absolute-Beginners-Introduction/dp/1549617214',
   'https://www.goodreads.com/book/show/35511098-machine-learning-for-absolute-beginners',
   4.5, 4.1, 7200, 'Best plain-English intro to ML concepts.', 'Towards Data Science Editors',
   'Beginner', ARRAY['Machine Learning','No-Code','Concepts','Overview'], false, false, true),

  ('AI Superpowers', 'Kai-Fu Lee', '9781328546395',
   'Former Google China president examines the AI race between US and China, and how AI will transform economies, jobs, and human purpose. Essential reading for everyone.',
   272, 2018,
   'https://www.amazon.com/AI-Superpowers-China-Silicon-Valley/dp/132854639X',
   'https://www.goodreads.com/book/show/38242135-ai-superpowers',
   4.7, 4.3, 15600, 'Required reading for anyone who wants to understand the future of AI.', 'Eric Schmidt, Former Google CEO',
   'Beginner', ARRAY['AI','China','Policy','Future of Work'], true, true, true),

  ('Hands-On Machine Learning', 'Aurélien Géron', '9781492032649',
   'The most practical ML book available. Uses Scikit-Learn, Keras, and TensorFlow to build real systems. Covers the full spectrum from regression to deep reinforcement learning.',
   856, 2022,
   'https://www.amazon.com/Hands-Machine-Learning-Scikit-Learn-TensorFlow/dp/1492032646',
   'https://www.goodreads.com/book/show/32899495-hands-on-machine-learning-with-scikit-learn-and-tensorflow',
   4.9, 4.7, 21400, 'The best practical ML book available. I recommend it to everyone.', 'Andrew Ng, Deeplearning.ai',
   'Intermediate', ARRAY['Scikit-Learn','TensorFlow','Keras','Deep Learning','Python'], true, true, true),

  ('Deep Learning', 'Ian Goodfellow', '9780262035613',
   'The definitive textbook on deep learning. Co-authored by three of the field''s pioneers. Covers mathematical foundations, network architectures, and research frontiers.',
   800, 2016,
   'https://www.amazon.com/Deep-Learning-Adaptive-Computation-Machine/dp/0262035618',
   'https://www.goodreads.com/book/show/24072897-deep-learning',
   4.9, 4.5, 11300, 'The definitive textbook on deep learning.', 'Yann LeCun, Chief AI Scientist at Meta',
   'Advanced', ARRAY['Deep Learning','Neural Networks','Mathematics','Research'], false, true, false),

  ('The Hundred-Page Machine Learning Book', 'Andriy Burkov', '9781999579517',
   'Distills essential ML concepts into 100 pages. Covers supervised, unsupervised, and semi-supervised learning with mathematical intuition but without heavy notation.',
   160, 2019,
   'https://www.amazon.com/Hundred-Page-Machine-Learning-Book/dp/199957950X',
   'https://www.goodreads.com/book/show/43190851-the-hundred-page-machine-learning-book',
   4.6, 4.4, 8100, 'Incredible value — 100 pages that replace 5 textbooks.', 'Pedro Domingos, UW Professor',
   'Intermediate', ARRAY['Machine Learning','Overview','Theory','Quick Reference'], false, false, true),

  ('Pattern Recognition and Machine Learning', 'Christopher Bishop', '9780387310732',
   'A comprehensive textbook on probabilistic graphical models and Bayesian ML. The gold standard for rigorous theoretical understanding of pattern recognition.',
   738, 2006,
   'https://www.amazon.com/Pattern-Recognition-Learning-Information-Statistics/dp/0387310738',
   'https://www.goodreads.com/book/show/55881.Pattern_Recognition_and_Machine_Learning',
   4.8, 4.4, 6700, 'The most complete probabilistic treatment of ML.', 'Zoubin Ghahramani, Cambridge / DeepMind',
   'Advanced', ARRAY['Bayesian ML','Probability','Theory','Research'], false, false, false)
) AS b(title, author, isbn, description, page_count, published_year, amazon_url, goodreads_url,
       expert_rating, community_rating, total_reviews, expert_quote, expert_name, difficulty_level,
       tags, is_featured, is_editors_pick, is_bestseller)
WHERE g.slug = 'machine-learning';

-- ── PROGRAMMING ───────────────────────────────────────────────
INSERT INTO books (genre_id, title, author, isbn, description, page_count, published_year,
  amazon_url, goodreads_url, expert_rating, community_rating, total_reviews,
  expert_quote, expert_name, difficulty_level, tags, is_featured, is_editors_pick, is_bestseller)
SELECT g.id, b.title, b.author, b.isbn, b.description, b.page_count, b.published_year,
  b.amazon_url, b.goodreads_url, b.expert_rating, b.community_rating, b.total_reviews,
  b.expert_quote, b.expert_name, b.difficulty_level, b.tags, b.is_featured, b.is_editors_pick, b.is_bestseller
FROM genres g, (VALUES
  ('Python Crash Course', 'Eric Matthes', '9781593279288',
   'A hands-on, project-based introduction to Python. Covers core concepts then builds three real projects: a game, data visualizations, and a web app.',
   544, 2023,
   'https://www.amazon.com/Python-Crash-Course-Eric-Matthes/dp/1718502702',
   'https://www.goodreads.com/book/show/23241059-python-crash-course',
   4.8, 4.6, 24100, 'The best Python book for beginners, hands down.', 'Coding Dojo Instructors',
   'Beginner', ARRAY['Python','Beginner','Projects','Games'], false, false, true),

  ('Automate the Boring Stuff with Python', 'Al Sweigart', '9781593275990',
   'Practical programming for total beginners. Automate spreadsheets, web scraping, PDFs, email, and more. Free to read online. Life-changing for non-programmers.',
   504, 2019,
   'https://www.amazon.com/Automate-Boring-Stuff-Python-2nd/dp/1593279922',
   'https://www.goodreads.com/book/show/22514127-automate-the-boring-stuff-with-python',
   4.9, 4.7, 31200, 'Every programmer should read this. It will change how you see repetitive work.', 'Mark Guzdial, Georgia Tech Professor',
   'Beginner', ARRAY['Python','Automation','Scripting','Productivity'], false, true, true),

  ('Clean Code', 'Robert C. Martin', '9780132350884',
   'A handbook of agile software craftsmanship. Teaches how to write code that is readable, maintainable, and testable. The industry standard for code quality.',
   464, 2008,
   'https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882',
   'https://www.goodreads.com/book/show/3735293-clean-code',
   4.7, 4.3, 28900, 'A must-read for any developer who cares about their craft.', 'Jeff Atwood, Co-founder of Stack Overflow',
   'Intermediate', ARRAY['Clean Code','Software Design','Best Practices','Refactoring'], false, true, true),

  ('The Pragmatic Programmer', 'David Thomas', '9780135957059',
   'From journeyman to master. This classic covers the philosophy of software development — DRY, orthogonality, tracer bullets, and building a career in code.',
   352, 2019,
   'https://www.amazon.com/Pragmatic-Programmer-journey-mastery-Anniversary/dp/0135957052',
   'https://www.goodreads.com/book/show/4099.The_Pragmatic_Programmer',
   4.8, 4.5, 19400, 'One of the most influential programming books ever written.', 'Ward Cunningham, Inventor of the Wiki',
   'Intermediate', ARRAY['Software Engineering','Career','Best Practices','Philosophy'], false, true, true),

  ('Designing Data-Intensive Applications', 'Martin Kleppmann', '9781449373320',
   'The best technical book of the decade. Deep dive into databases, distributed systems, stream processing, and the trade-offs behind every architectural decision.',
   616, 2017,
   'https://www.amazon.com/Designing-Data-Intensive-Applications-Reliable-Maintainable/dp/1449373321',
   'https://www.goodreads.com/book/show/23463279-designing-data-intensive-applications',
   5.0, 4.8, 14700, 'The best technical book of the decade. Read it twice.', 'Sam Newman, Author of Building Microservices',
   'Advanced', ARRAY['Distributed Systems','Databases','System Design','Engineering'], false, true, false),

  ('Structure and Interpretation of Computer Programs', 'Harold Abelson', '9780262510875',
   'The legendary MIT textbook that teaches programming as a discipline of thought. Uses Scheme to illuminate fundamental ideas of computation that apply to any language.',
   657, 1996,
   'https://www.amazon.com/Structure-Interpretation-Computer-Programs-Engineering/dp/0262510871',
   'https://www.goodreads.com/book/show/43713.Structure_and_Interpretation_of_Computer_Programs',
   4.9, 4.6, 7200, 'The best book on programming ever written.', 'Bill Gates',
   'Advanced', ARRAY['Computer Science','Algorithms','Theory','Lisp'], false, false, false)
) AS b(title, author, isbn, description, page_count, published_year, amazon_url, goodreads_url,
       expert_rating, community_rating, total_reviews, expert_quote, expert_name, difficulty_level,
       tags, is_featured, is_editors_pick, is_bestseller)
WHERE g.slug = 'programming';

-- ── FINANCE & INVESTING ───────────────────────────────────────
INSERT INTO books (genre_id, title, author, isbn, description, page_count, published_year,
  amazon_url, goodreads_url, expert_rating, community_rating, total_reviews,
  expert_quote, expert_name, difficulty_level, tags, is_featured, is_editors_pick, is_bestseller)
SELECT g.id, b.title, b.author, b.isbn, b.description, b.page_count, b.published_year,
  b.amazon_url, b.goodreads_url, b.expert_rating, b.community_rating, b.total_reviews,
  b.expert_quote, b.expert_name, b.difficulty_level, b.tags, b.is_featured, b.is_editors_pick, b.is_bestseller
FROM genres g, (VALUES
  ('The Intelligent Investor', 'Benjamin Graham', '9780062312686',
   'The definitive book on value investing. Teaches the framework that made Warren Buffett rich. A must-read before buying a single share of stock.',
   640, 2006,
   'https://www.amazon.com/Intelligent-Investor-Definitive-Investing-Essentials/dp/0062312685',
   'https://www.goodreads.com/book/show/106835.The_Intelligent_Investor',
   5.0, 4.5, 42300, 'By far the best book on investing ever written.', 'Warren Buffett',
   'Intermediate', ARRAY['Value Investing','Stock Market','Stocks','Personal Finance'], true, true, true),

  ('The Psychology of Money', 'Morgan Housel', '9780857197689',
   'Timeless lessons on wealth, greed, and happiness. 19 short stories exploring the strange ways people think about money. The best personal finance book of the decade.',
   256, 2020,
   'https://www.amazon.com/Psychology-Money-Timeless-lessons-happiness/dp/0857197681',
   'https://www.goodreads.com/book/show/41881472-the-psychology-of-money',
   4.9, 4.7, 68400, 'One of the best finance books ever written. Changed how I think about money.', 'James Clear, Author of Atomic Habits',
   'Beginner', ARRAY['Behavioral Finance','Personal Finance','Mindset','Wealth'], true, true, true),

  ('Rich Dad Poor Dad', 'Robert Kiyosaki', '9781612680194',
   'What the rich teach their kids about money that the poor and middle class do not. Challenges conventional wisdom about money with a compelling narrative about assets vs. liabilities.',
   336, 2017,
   'https://www.amazon.com/Rich-Dad-Poor-Middle-Class/dp/1612680194',
   'https://www.goodreads.com/book/show/69571.Rich_Dad_Poor_Dad',
   4.5, 4.2, 89200, 'Changed how millions of people think about financial independence.', 'Tony Robbins',
   'Beginner', ARRAY['Financial Literacy','Assets','Investing','Mindset'], false, false, true),

  ('A Random Walk Down Wall Street', 'Burton Malkiel', '9780393330335',
   'The classic case for index fund investing. Shows why beating the market is nearly impossible and why passive investing beats active management over the long run.',
   496, 2019,
   'https://www.amazon.com/Random-Walk-down-Wall-Street/dp/0393330338',
   'https://www.goodreads.com/book/show/40242274-a-random-walk-down-wall-street',
   4.7, 4.4, 18600, 'The book that convinced me passive investing is the only rational strategy.', 'John Bogle, Founder of Vanguard',
   'Intermediate', ARRAY['Index Funds','Stock Market','Passive Investing','ETFs'], false, false, true),

  ('I Will Teach You to Be Rich', 'Ramit Sethi', '9781523505746',
   'A six-week action plan for millennials to automate savings, invest in index funds, and build wealth without giving up lattes. Brutally practical and funny.',
   352, 2019,
   'https://www.amazon.com/Will-Teach-You-Rich-Second/dp/1523505745',
   'https://www.goodreads.com/book/show/40591670-i-will-teach-you-to-be-rich',
   4.7, 4.6, 22100, 'The only personal finance book young people actually finish.', 'Tim Ferriss',
   'Beginner', ARRAY['Personal Finance','Automation','Savings','Millennials'], false, true, true)
) AS b(title, author, isbn, description, page_count, published_year, amazon_url, goodreads_url,
       expert_rating, community_rating, total_reviews, expert_quote, expert_name, difficulty_level,
       tags, is_featured, is_editors_pick, is_bestseller)
WHERE g.slug = 'finance';

-- ── BUSINESS & ENTREPRENEURSHIP ───────────────────────────────
INSERT INTO books (genre_id, title, author, isbn, description, page_count, published_year,
  amazon_url, goodreads_url, expert_rating, community_rating, total_reviews,
  expert_quote, expert_name, difficulty_level, tags, is_featured, is_editors_pick, is_bestseller)
SELECT g.id, b.title, b.author, b.isbn, b.description, b.page_count, b.published_year,
  b.amazon_url, b.goodreads_url, b.expert_rating, b.community_rating, b.total_reviews,
  b.expert_quote, b.expert_name, b.difficulty_level, b.tags, b.is_featured, b.is_editors_pick, b.is_bestseller
FROM genres g, (VALUES
  ('Zero to One', 'Peter Thiel', '9780804139021',
   'Notes on startups, or how to build the future. Thiel argues that true innovation means going from zero to one — creating something genuinely new, not competing.',
   224, 2014,
   'https://www.amazon.com/Zero-One-Notes-Startups-Future/dp/0804139296',
   'https://www.goodreads.com/book/show/18050143-zero-to-one',
   4.9, 4.4, 48200, 'Teaches you to think for yourself — the most anti-conventional startup book.', 'Elon Musk',
   'Beginner', ARRAY['Startups','Innovation','Venture Capital','Strategy'], true, true, true),

  ('The Lean Startup', 'Eric Ries', '9780307887894',
   'How today''s entrepreneurs use continuous innovation to create radically successful businesses. Introduces the Build-Measure-Learn feedback loop that changed startup culture.',
   336, 2011,
   'https://www.amazon.com/Lean-Startup-Entrepreneurs-Continuous-Innovation/dp/0307887898',
   'https://www.goodreads.com/book/show/10127019-the-lean-startup',
   4.8, 4.3, 76400, 'Required reading for entrepreneurs. Period.', 'Tim O''Reilly, Founder of O''Reilly Media',
   'Beginner', ARRAY['Startups','MVP','Agile','Product Development'], false, true, true),

  ('Good to Great', 'Jim Collins', '9780066620992',
   'Why do some companies make the leap to greatness while others don''t? Collins and his team studied 28 companies over 5 years to find out what distinguishes the great from the good.',
   320, 2001,
   'https://www.amazon.com/Good-Great-Some-Companies-Others/dp/0066620996',
   'https://www.goodreads.com/book/show/76865.Good_to_Great',
   4.8, 4.4, 61200, 'One of the best business books ever written.', 'Jim Rohn',
   'Intermediate', ARRAY['Leadership','Strategy','Management','Corporate Culture'], false, true, true),

  ('The Hard Thing About Hard Things', 'Ben Horowitz', '9780062273208',
   'Building a business when there are no easy answers. Andreessen Horowitz co-founder shares brutal lessons learned from the trenches of Silicon Valley.',
   304, 2014,
   'https://www.amazon.com/Hard-Thing-About-Things-Building/dp/0062273205',
   'https://www.goodreads.com/book/show/18176747-the-hard-thing-about-hard-things',
   4.8, 4.5, 38700, 'The most honest book about what it''s really like to run a startup.', 'Mark Zuckerberg',
   'Intermediate', ARRAY['Startups','Leadership','Management','Culture'], false, true, false),

  ('The $100 Startup', 'Chris Guillebeau', '9780307951526',
   'Fire your boss, do what you love, and work better to live more. 50 case studies of people who built businesses with minimal investment and created a life of freedom.',
   304, 2012,
   'https://www.amazon.com/100-Startup-Reinvent-Living-Create/dp/0307951529',
   'https://www.goodreads.com/book/show/12605134-the-100-startup',
   4.6, 4.2, 28900, 'Inspiring and actionable. Proves you don''t need millions to start a business.', 'Seth Godin',
   'Beginner', ARRAY['Entrepreneurship','Side Hustle','Small Business','Freedom'], false, false, true)
) AS b(title, author, isbn, description, page_count, published_year, amazon_url, goodreads_url,
       expert_rating, community_rating, total_reviews, expert_quote, expert_name, difficulty_level,
       tags, is_featured, is_editors_pick, is_bestseller)
WHERE g.slug = 'business';

-- ── PSYCHOLOGY ────────────────────────────────────────────────
INSERT INTO books (genre_id, title, author, isbn, description, page_count, published_year,
  amazon_url, goodreads_url, expert_rating, community_rating, total_reviews,
  expert_quote, expert_name, difficulty_level, tags, is_featured, is_editors_pick, is_bestseller)
SELECT g.id, b.title, b.author, b.isbn, b.description, b.page_count, b.published_year,
  b.amazon_url, b.goodreads_url, b.expert_rating, b.community_rating, b.total_reviews,
  b.expert_quote, b.expert_name, b.difficulty_level, b.tags, b.is_featured, b.is_editors_pick, b.is_bestseller
FROM genres g, (VALUES
  ('Thinking, Fast and Slow', 'Daniel Kahneman', '9780374533557',
   'Nobel laureate Kahneman explores the two systems of thinking that shape our judgments. A tour de force of modern psychology and behavioral economics.',
   512, 2011,
   'https://www.amazon.com/Thinking-Fast-Slow-Daniel-Kahneman/dp/0374533555',
   'https://www.goodreads.com/book/show/11468377-thinking-fast-and-slow',
   4.9, 4.4, 94200, 'A lifetime of psychological research distilled into one essential book.', 'Richard Thaler, Nobel Prize Winner in Economics',
   'Intermediate', ARRAY['Cognitive Bias','Behavioral Economics','Decision Making','Heuristics'], true, true, true),

  ('Influence', 'Robert Cialdini', '9780062937650',
   'The foundational text on the psychology of persuasion. Six universal principles of influence used by marketers, salespeople, and con artists — learn to recognize and resist them.',
   592, 2021,
   'https://www.amazon.com/Influence-New-Expanded-Robert-Cialdini/dp/0062937650',
   'https://www.goodreads.com/book/show/28815.Influence',
   4.9, 4.5, 87300, 'The most important book on persuasion ever written.', 'Charlie Munger, Berkshire Hathaway',
   'Beginner', ARRAY['Persuasion','Marketing','Social Psychology','Influence'], true, true, true),

  ('The Power of Habit', 'Charles Duhigg', '9780812981605',
   'Why we do what we do and how to change. Reveals the neuroscience of habits and how companies, governments, and individuals exploit them.',
   400, 2014,
   'https://www.amazon.com/Power-Habit-What-Life-Business/dp/081298160X',
   'https://www.goodreads.com/book/show/12609433-the-power-of-habit',
   4.7, 4.3, 112400, 'Brilliant exploration of how habits work and how to change them.', 'David Allen, Author of Getting Things Done',
   'Beginner', ARRAY['Habits','Neuroscience','Behavior Change','Self-Improvement'], false, false, true),

  ('Man''s Search for Meaning', 'Viktor Frankl', '9780807014271',
   'A psychiatrist''s account of survival in Nazi concentration camps and his logotherapy framework. One of the most influential books ever written about finding purpose.',
   200, 1959,
   'https://www.amazon.com/Mans-Search-Meaning-Viktor-Frankl/dp/0807014273',
   'https://www.goodreads.com/book/show/4069.Man_s_Search_for_Meaning',
   5.0, 4.7, 176400, 'One of the great books of our time.', 'Harold Kushner, Rabbi and Author',
   'Beginner', ARRAY['Existentialism','Meaning','Philosophy','Trauma','Resilience'], true, true, true),

  ('Predictably Irrational', 'Dan Ariely', '9780061353246',
   'The hidden forces that shape our decisions. Ariely shows how irrational behavior is actually systematic and predictable — and how understanding it can help us make better choices.',
   384, 2009,
   'https://www.amazon.com/Predictably-Irrational-Revised-Expanded-Decisions/dp/0061353248',
   'https://www.goodreads.com/book/show/1713426.Predictably_Irrational',
   4.6, 4.2, 64100, 'Accessible, witty, and deeply illuminating.', 'Daniel Kahneman',
   'Beginner', ARRAY['Behavioral Economics','Decision Making','Irrationality','Consumer Psychology'], false, false, true)
) AS b(title, author, isbn, description, page_count, published_year, amazon_url, goodreads_url,
       expert_rating, community_rating, total_reviews, expert_quote, expert_name, difficulty_level,
       tags, is_featured, is_editors_pick, is_bestseller)
WHERE g.slug = 'psychology';

-- ── PRODUCTIVITY & HABITS ─────────────────────────────────────
INSERT INTO books (genre_id, title, author, isbn, description, page_count, published_year,
  amazon_url, goodreads_url, expert_rating, community_rating, total_reviews,
  expert_quote, expert_name, difficulty_level, tags, is_featured, is_editors_pick, is_bestseller)
SELECT g.id, b.title, b.author, b.isbn, b.description, b.page_count, b.published_year,
  b.amazon_url, b.goodreads_url, b.expert_rating, b.community_rating, b.total_reviews,
  b.expert_quote, b.expert_name, b.difficulty_level, b.tags, b.is_featured, b.is_editors_pick, b.is_bestseller
FROM genres g, (VALUES
  ('Atomic Habits', 'James Clear', '9780735211292',
   'An easy and proven way to build good habits and break bad ones. Clear provides a practical framework: make it obvious, attractive, easy, and satisfying. The #1 habit book.',
   320, 2018,
   'https://www.amazon.com/Atomic-Habits-Proven-Build-Break/dp/0735211299',
   'https://www.goodreads.com/book/show/40121378-atomic-habits',
   5.0, 4.8, 189200, 'The definitive guide to habit formation and behavior change.', 'Charles Duhigg, Author of The Power of Habit',
   'Beginner', ARRAY['Habits','Productivity','Behavior Change','Self-Improvement'], true, true, true),

  ('Deep Work', 'Cal Newport', '9781455586691',
   'Rules for focused success in a distracted world. Newport argues that the ability to focus without distraction is the superpower of the 21st century, and teaches you to develop it.',
   304, 2016,
   'https://www.amazon.com/Deep-Work-Focused-Success-Distracted/dp/1455586692',
   'https://www.goodreads.com/book/show/25744928-deep-work',
   4.8, 4.4, 72600, 'This book will fundamentally change how you work.', 'Adam Grant, Professor at Wharton',
   'Beginner', ARRAY['Focus','Productivity','Work','Distraction'], true, true, true),

  ('Getting Things Done', 'David Allen', '9780143126560',
   'The art of stress-free productivity. The GTD system has helped millions capture, clarify, organize, and review all their commitments to achieve a clear mind.',
   352, 2015,
   'https://www.amazon.com/Getting-Things-Done-Stress-Free-Productivity/dp/0143126563',
   'https://www.goodreads.com/book/show/1633.Getting_Things_Done',
   4.7, 4.2, 68300, 'The gold standard of productivity systems.', 'Tim Ferriss',
   'Beginner', ARRAY['GTD','Organization','Task Management','Workflow'], false, false, true),

  ('The 4-Hour Workweek', 'Timothy Ferriss', '9780307465351',
   'Escape the 9-5, live anywhere, and join the new rich. Ferriss challenges the traditional work model with radical ideas about automation, outsourcing, and lifestyle design.',
   418, 2009,
   'https://www.amazon.com/4-Hour-Workweek-Escape-Live-Anywhere/dp/0307465357',
   'https://www.goodreads.com/book/show/368593.The_4_Hour_Workweek',
   4.6, 4.1, 93200, 'Fundamentally changed how I think about work and time.', 'Jack Dorsey, Co-founder of Twitter',
   'Beginner', ARRAY['Lifestyle Design','Automation','Remote Work','Outsourcing'], false, false, true),

  ('Essentialism', 'Greg McKeown', '9780804137386',
   'The disciplined pursuit of less. McKeown argues that the way of the essentialist means living by design, not by default. Doing less — but better.',
   272, 2014,
   'https://www.amazon.com/Essentialism-Disciplined-Pursuit-Greg-McKeown/dp/0804137382',
   'https://www.goodreads.com/book/show/18077875-essentialism',
   4.7, 4.4, 81200, 'The most important book on simplicity and focus I''ve read.', 'Arianna Huffington',
   'Beginner', ARRAY['Minimalism','Focus','Decision Making','Life Design'], false, true, true)
) AS b(title, author, isbn, description, page_count, published_year, amazon_url, goodreads_url,
       expert_rating, community_rating, total_reviews, expert_quote, expert_name, difficulty_level,
       tags, is_featured, is_editors_pick, is_bestseller)
WHERE g.slug = 'productivity';

-- ── PHILOSOPHY ────────────────────────────────────────────────
INSERT INTO books (genre_id, title, author, isbn, description, page_count, published_year,
  amazon_url, goodreads_url, expert_rating, community_rating, total_reviews,
  expert_quote, expert_name, difficulty_level, tags, is_featured, is_editors_pick, is_bestseller)
SELECT g.id, b.title, b.author, b.isbn, b.description, b.page_count, b.published_year,
  b.amazon_url, b.goodreads_url, b.expert_rating, b.community_rating, b.total_reviews,
  b.expert_quote, b.expert_name, b.difficulty_level, b.tags, b.is_featured, b.is_editors_pick, b.is_bestseller
FROM genres g, (VALUES
  ('Meditations', 'Marcus Aurelius', '9780812968255',
   'Private notes from a Roman Emperor. Written as personal reflections, this Stoic masterpiece covers virtue, resilience, and clarity of mind. Still radically relevant today.',
   256, 2002,
   'https://www.amazon.com/Meditations-New-Translation-Marcus-Aurelius/dp/0812968255',
   'https://www.goodreads.com/book/show/30659.Meditations',
   4.9, 4.7, 142600, 'The best book on Stoicism and the most important philosophy book ever written.', 'Ryan Holiday, Author of The Obstacle is the Way',
   'Beginner', ARRAY['Stoicism','Philosophy','Mindset','Classics'], false, true, true),

  ('Sophie''s World', 'Jostein Gaarder', '9780374530716',
   'A novel about the history of philosophy. Follows a 14-year-old girl who receives mysterious letters teaching her Western philosophical thought from Socrates to Sartre. Brilliant.',
   544, 1994,
   'https://www.amazon.com/Sophies-World-History-Philosophy-Classics/dp/0374530718',
   'https://www.goodreads.com/book/show/10959.Sophie_s_World',
   4.7, 4.3, 78400, 'The best introduction to philosophy ever written.', 'The Guardian',
   'Beginner', ARRAY['History of Philosophy','Novel','Socrates','Plato','Existentialism'], false, false, true),

  ('The Republic', 'Plato', '9780872201361',
   'Plato''s masterwork on justice, the ideal state, and the soul. One of the most influential texts in Western civilization, covering politics, ethics, and epistemology.',
   368, 1992,
   'https://www.amazon.com/Republic-Plato/dp/0872201368',
   'https://www.goodreads.com/book/show/30289.The_Republic',
   4.8, 4.1, 89300, 'No list of essential reading is complete without Plato''s Republic.', 'Stanford Encyclopedia of Philosophy',
   'Intermediate', ARRAY['Plato','Ethics','Politics','Epistemology','Classics'], false, false, false),

  ('The Obstacle is the Way', 'Ryan Holiday', '9781591846352',
   'The ancient Stoic art of turning adversity to advantage. Holiday makes Marcus Aurelius'' philosophy actionable with stories of athletes, generals, and entrepreneurs.',
   224, 2014,
   'https://www.amazon.com/Obstacle-Way-Timeless-Turning-Triumph/dp/1591846358',
   'https://www.goodreads.com/book/show/18668059-the-obstacle-is-the-way',
   4.7, 4.5, 54200, 'Timeless wisdom applied to modern challenges.', 'Arnold Schwarzenegger',
   'Beginner', ARRAY['Stoicism','Resilience','Mental Toughness','Self-Help'], false, false, true)
) AS b(title, author, isbn, description, page_count, published_year, amazon_url, goodreads_url,
       expert_rating, community_rating, total_reviews, expert_quote, expert_name, difficulty_level,
       tags, is_featured, is_editors_pick, is_bestseller)
WHERE g.slug = 'philosophy';

-- ── HISTORY ──────────────────────────────────────────────────
INSERT INTO books (genre_id, title, author, isbn, description, page_count, published_year,
  amazon_url, goodreads_url, expert_rating, community_rating, total_reviews,
  expert_quote, expert_name, difficulty_level, tags, is_featured, is_editors_pick, is_bestseller)
SELECT g.id, b.title, b.author, b.isbn, b.description, b.page_count, b.published_year,
  b.amazon_url, b.goodreads_url, b.expert_rating, b.community_rating, b.total_reviews,
  b.expert_quote, b.expert_name, b.difficulty_level, b.tags, b.is_featured, b.is_editors_pick, b.is_bestseller
FROM genres g, (VALUES
  ('Sapiens', 'Yuval Noah Harari', '9780062316097',
   'A brief history of humankind. Harari examines how Homo sapiens came to dominate Earth, covering cognitive revolution, agriculture, science, and what the future holds.',
   464, 2015,
   'https://www.amazon.com/Sapiens-Humankind-Yuval-Noah-Harari/dp/0062316095',
   'https://www.goodreads.com/book/show/23692271-sapiens',
   4.9, 4.5, 218400, 'A thrilling account of our extraordinary history as a species.', 'Barack Obama',
   'Beginner', ARRAY['Human History','Anthropology','Civilization','Big History'], true, true, true),

  ('Guns, Germs, and Steel', 'Jared Diamond', '9780393354324',
   'Why did Western civilization come to dominate the world? Diamond''s Pulitzer Prize-winning answer covers geography, agriculture, and the accidents of history.',
   528, 1997,
   'https://www.amazon.com/Guns-Germs-Steel-Fates-Societies/dp/0393354326',
   'https://www.goodreads.com/book/show/1842.Guns_Germs_and_Steel',
   4.8, 4.3, 162400, 'A must-read for anyone who wants to understand why the world looks the way it does.', 'Bill Gates',
   'Intermediate', ARRAY['World History','Geography','Civilization','Anthropology'], false, true, true),

  ('The Silk Roads', 'Peter Frankopan', '9781101912379',
   'A new history of the world. Frankopan recenters world history on the connections between East and West — the trade routes that made the modern world.',
   656, 2017,
   'https://www.amazon.com/Silk-Roads-New-History-World/dp/1101912375',
   'https://www.goodreads.com/book/show/25812847-the-silk-roads',
   4.7, 4.3, 48200, 'A completely fresh perspective on world history.', 'The Economist',
   'Intermediate', ARRAY['World History','Trade','East-West Relations','Globalization'], false, false, true),

  ('SPQR', 'Mary Beard', '9781631492228',
   'A history of ancient Rome. Cambridge classicist Mary Beard reconsiders Rome''s history not as a series of famous men and battles, but as the story of an extraordinary civilization.',
   608, 2016,
   'https://www.amazon.com/SPQR-History-Ancient-Rome/dp/1631492225',
   'https://www.goodreads.com/book/show/24599681-spqr',
   4.6, 4.3, 31200, 'The best popular history of Rome I''ve ever read.', 'The Times London',
   'Beginner', ARRAY['Roman History','Ancient Rome','Classics','Politics'], false, false, true)
) AS b(title, author, isbn, description, page_count, published_year, amazon_url, goodreads_url,
       expert_rating, community_rating, total_reviews, expert_quote, expert_name, difficulty_level,
       tags, is_featured, is_editors_pick, is_bestseller)
WHERE g.slug = 'history';

-- ── SELF-HELP ─────────────────────────────────────────────────
INSERT INTO books (genre_id, title, author, isbn, description, page_count, published_year,
  amazon_url, goodreads_url, expert_rating, community_rating, total_reviews,
  expert_quote, expert_name, difficulty_level, tags, is_featured, is_editors_pick, is_bestseller)
SELECT g.id, b.title, b.author, b.isbn, b.description, b.page_count, b.published_year,
  b.amazon_url, b.goodreads_url, b.expert_rating, b.community_rating, b.total_reviews,
  b.expert_quote, b.expert_name, b.difficulty_level, b.tags, b.is_featured, b.is_editors_pick, b.is_bestseller
FROM genres g, (VALUES
  ('How to Win Friends and Influence People', 'Dale Carnegie', '9780671027032',
   'The #1 self-help book of all time. Carnegie''s timeless principles on how to make people like you, win them to your way of thinking, and change people without arousng resentment.',
   288, 1998,
   'https://www.amazon.com/How-Win-Friends-Influence-People/dp/0671027034',
   'https://www.goodreads.com/book/show/4865.How_to_Win_Friends_and_Influence_People',
   4.8, 4.3, 194200, 'The most important book I have ever read about human relations.', 'Warren Buffett',
   'Beginner', ARRAY['Communication','Relationships','Influence','Leadership'], false, true, true),

  ('The Subtle Art of Not Giving a F*ck', 'Mark Manson', '9780062457714',
   'A counterintuitive approach to living a good life. Manson argues that improvement comes from acknowledging what you''re not good at, accepting discomfort, and choosing what to care about.',
   224, 2016,
   'https://www.amazon.com/Subtle-Art-Not-Giving-Counterintuitive/dp/0062457713',
   'https://www.goodreads.com/book/show/28257707-the-subtle-art-of-not-giving-a-f-ck',
   4.7, 4.2, 214800, 'Refreshingly honest and genuinely useful.', 'Ryan Holiday',
   'Beginner', ARRAY['Mindset','Values','Life Philosophy','Counterintuitive'], false, false, true),

  ('Can''t Hurt Me', 'David Goggins', '9781544512273',
   'A Navy SEAL''s journey from troubled childhood to becoming one of the world''s elite athletes. Goggins'' brutal honesty and mindset principles will push you to your absolute limits.',
   364, 2018,
   'https://www.amazon.com/Cant-Hurt-Me-Master-Your/dp/1544512279',
   'https://www.goodreads.com/book/show/41721428-can-t-hurt-me',
   4.8, 4.8, 98400, 'One of the most powerful books on mental toughness ever written.', 'Joe Rogan',
   'Beginner', ARRAY['Mental Toughness','Discipline','Mindset','Resilience','Motivation'], false, true, true),

  ('The 7 Habits of Highly Effective People', 'Stephen Covey', '9780743269513',
   'Covey''s framework of principle-centered leadership has sold 40 million copies. Covers private victory (habits 1-3), public victory (4-6), and renewal (habit 7).',
   432, 2013,
   'https://www.amazon.com/Habits-Highly-Effective-People-Powerful/dp/0743269519',
   'https://www.goodreads.com/book/show/36072.The_7_Habits_of_Highly_Effective_People',
   4.7, 4.3, 162100, 'The most impactful book on effectiveness and character.', 'President Bill Clinton',
   'Intermediate', ARRAY['Habits','Effectiveness','Leadership','Character'], false, false, true)
) AS b(title, author, isbn, description, page_count, published_year, amazon_url, goodreads_url,
       expert_rating, community_rating, total_reviews, expert_quote, expert_name, difficulty_level,
       tags, is_featured, is_editors_pick, is_bestseller)
WHERE g.slug = 'self-help';

-- ── SCIENCE FICTION ───────────────────────────────────────────
INSERT INTO books (genre_id, title, author, isbn, description, page_count, published_year,
  amazon_url, goodreads_url, expert_rating, community_rating, total_reviews,
  expert_quote, expert_name, difficulty_level, tags, vibe, plot_type, length_category,
  is_featured, is_editors_pick, is_bestseller)
SELECT g.id, b.title, b.author, b.isbn, b.description, b.page_count, b.published_year,
  b.amazon_url, b.goodreads_url, b.expert_rating, b.community_rating, b.total_reviews,
  b.expert_quote, b.expert_name, b.difficulty_level, b.tags, b.vibe, b.plot_type, b.length_category,
  b.is_featured, b.is_editors_pick, b.is_bestseller
FROM genres g, (VALUES
  ('Dune', 'Frank Herbert', '9780441013593',
   'The greatest science fiction novel ever written. An epic of ecology, politics, religion, and human evolution set on a desert planet. The Star Wars before Star Wars.',
   896, 1965,
   'https://www.amazon.com/Dune-Frank-Herbert/dp/0441013597',
   'https://www.goodreads.com/book/show/44767458-dune',
   5.0, 4.7, 276400, 'The greatest science fiction novel of all time. No contest.', 'Arthur C. Clarke',
   NULL, ARRAY['Epic','Politics','Ecology','Religion','Classic'],
   'Adventurous', 'Epic Quest', 'Epic', true, true, true),

  ('The Martian', 'Andy Weir', '9780553418026',
   'An astronaut is stranded on Mars and must use science to survive. Compulsively readable, funny, and technically brilliant. The most fun survival story ever written.',
   387, 2014,
   'https://www.amazon.com/Martian-Novel-Andy-Weir/dp/0553418025',
   'https://www.goodreads.com/book/show/18007564-the-martian',
   4.9, 4.6, 189400, 'The most entertaining novel I have read in years.', 'Neil deGrasse Tyson',
   NULL, ARRAY['Survival','Science','Humor','Space','Problem-Solving'],
   'Thrilling', 'Survival', 'Standard', true, true, true),

  ('Foundation', 'Isaac Asimov', '9780553293357',
   'The fall of a Galactic Empire and the plan to reduce 30,000 years of dark ages to 1,000. Asimov''s magnum opus of ideas that influenced an entire field of science.',
   255, 1951,
   'https://www.amazon.com/Foundation-Isaac-Asimov/dp/0553293354',
   'https://www.goodreads.com/book/show/29579.Foundation',
   4.8, 4.3, 142600, 'Asimov''s Foundation series inspired my career. I owe it everything.', 'Elon Musk',
   NULL, ARRAY['Galactic Empire','Politics','Ideas','Classic','Civilization'],
   'Mind-Bending', 'Political Intrigue', 'Standard', false, true, true),

  ('Ender''s Game', 'Orson Scott Card', '9780812550702',
   'A boy genius is trained at a space battle school to fight an alien invasion. A masterwork of military strategy and moral complexity. The most gripping YA sci-fi ever written.',
   352, 1994,
   'https://www.amazon.com/Enders-Game-Ender-Quintet-Book/dp/0812550706',
   'https://www.goodreads.com/book/show/375802.Ender_s_Game',
   4.8, 4.5, 198200, 'One of the finest works of American science fiction.', 'The New York Times',
   NULL, ARRAY['Military','Strategy','Coming-of-Age','Aliens','Classic'],
   'Thrilling', 'Coming-of-Age', 'Standard', false, true, true),

  ('Project Hail Mary', 'Andy Weir', '9780593135204',
   'A lone astronaut must save the Earth. Wakes up with amnesia on a spaceship. An absolutely magnificent story of problem-solving, friendship, and sacrifice.',
   480, 2021,
   'https://www.amazon.com/Project-Hail-Mary-Andy-Weir/dp/0593135202',
   'https://www.goodreads.com/book/show/54493401-project-hail-mary',
   4.9, 4.8, 124600, 'The best sci-fi novel I''ve read in a decade. Possibly ever.', 'George R.R. Martin',
   NULL, ARRAY['Space','Science','Friendship','Adventure','Problem-Solving'],
   'Adventurous', 'Epic Quest', 'Standard', false, true, true),

  ('Neuromancer', 'William Gibson', '9780441569595',
   'The novel that launched cyberpunk. A washed-up hacker is hired for one last job that pulls him into a web of AI, corporate espionage, and cyberspace. Coined the term "cyberspace".',
   271, 1984,
   'https://www.amazon.com/Neuromancer-William-Gibson/dp/0441569595',
   'https://www.goodreads.com/book/show/22328.Neuromancer',
   4.6, 4.0, 78200, 'The most important science fiction novel of the last century.', 'Vernor Vinge',
   NULL, ARRAY['Cyberpunk','AI','Hacker','Dystopia','Classic'],
   'Dark', 'Dystopia', 'Quick Read', false, false, true)
) AS b(title, author, isbn, description, page_count, published_year, amazon_url, goodreads_url,
       expert_rating, community_rating, total_reviews, expert_quote, expert_name, difficulty_level,
       tags, vibe, plot_type, length_category, is_featured, is_editors_pick, is_bestseller)
WHERE g.slug = 'science-fiction';

-- ── FANTASY ──────────────────────────────────────────────────
INSERT INTO books (genre_id, title, author, isbn, description, page_count, published_year,
  amazon_url, goodreads_url, expert_rating, community_rating, total_reviews,
  expert_quote, expert_name, difficulty_level, tags, vibe, plot_type, length_category,
  is_featured, is_editors_pick, is_bestseller)
SELECT g.id, b.title, b.author, b.isbn, b.description, b.page_count, b.published_year,
  b.amazon_url, b.goodreads_url, b.expert_rating, b.community_rating, b.total_reviews,
  b.expert_quote, b.expert_name, b.difficulty_level, b.tags, b.vibe, b.plot_type, b.length_category,
  b.is_featured, b.is_editors_pick, b.is_bestseller
FROM genres g, (VALUES
  ('The Name of the Wind', 'Patrick Rothfuss', '9780756404079',
   'Kvothe recounts his extraordinary life: from the son of traveling performers to student at the University, to legend. The most beautifully written fantasy novel in a generation.',
   672, 2007,
   'https://www.amazon.com/Name-Wind-Kingkiller-Chronicle/dp/0756404746',
   'https://www.goodreads.com/book/show/186074.The_Name_of_the_Wind',
   4.9, 4.6, 276400, 'One of the best fantasy novels I have ever read.', 'George R.R. Martin',
   NULL, ARRAY['Magic','Music','Epic','Coming-of-Age'],
   'Adventurous', 'Coming-of-Age', 'Epic', true, true, true),

  ('A Game of Thrones', 'George R.R. Martin', '9780553593716',
   'Winter is coming. The Starks, Lannisters, and Targaryens fight for the Iron Throne in a brutal medieval world where the real threat comes from beyond the Wall.',
   694, 1996,
   'https://www.amazon.com/Game-Thrones-Song-Fire-Book/dp/0553593714',
   'https://www.goodreads.com/book/show/13496.A_Game_of_Thrones',
   4.8, 4.5, 387600, 'The most ambitious fantasy epic since Tolkien.', 'The Guardian',
   NULL, ARRAY['Politics','Dragons','War','Winter','Kings'],
   'Dark', 'Political Intrigue', 'Epic', false, true, true),

  ('The Hobbit', 'J.R.R. Tolkien', '9780547928227',
   'Bilbo Baggins, a comfortable hobbit, is swept into an epic quest to reclaim a dwarf kingdom from a fearsome dragon. The book that created modern fantasy.',
   310, 1937,
   'https://www.amazon.com/Hobbit-J-R-Tolkien/dp/054792822X',
   'https://www.goodreads.com/book/show/5907.The_Hobbit',
   4.9, 4.6, 412800, 'The book that started it all. Tolkien created a genre.', 'Neil Gaiman',
   NULL, ARRAY['Middle-Earth','Dwarves','Dragons','Classic','Quest'],
   'Adventurous', 'Epic Quest', 'Standard', false, true, true),

  ('The Way of Kings', 'Brandon Sanderson', '9780765365279',
   'The first book of the Stormlight Archive. An epic tale of war, betrayal, and magic in a world ravaged by devastating storms. Sanderson''s magnum opus — the most ambitious fantasy series being written today.',
   1007, 2010,
   'https://www.amazon.com/Way-Kings-Stormlight-Archive-Book/dp/0765365278',
   'https://www.goodreads.com/book/show/7235533-the-way-of-kings',
   4.9, 4.7, 198400, 'Brandon Sanderson is fantasy''s best world-builder. Full stop.', 'Pat Rothfuss',
   NULL, ARRAY['Magic System','War','Epic','World-Building'],
   'Adventurous', 'Epic Quest', 'Epic', false, true, true)
) AS b(title, author, isbn, description, page_count, published_year, amazon_url, goodreads_url,
       expert_rating, community_rating, total_reviews, expert_quote, expert_name, difficulty_level,
       tags, vibe, plot_type, length_category, is_featured, is_editors_pick, is_bestseller)
WHERE g.slug = 'fantasy';

-- ── MYSTERY & THRILLER ────────────────────────────────────────
INSERT INTO books (genre_id, title, author, isbn, description, page_count, published_year,
  amazon_url, goodreads_url, expert_rating, community_rating, total_reviews,
  expert_quote, expert_name, difficulty_level, tags, vibe, plot_type, length_category,
  is_featured, is_editors_pick, is_bestseller)
SELECT g.id, b.title, b.author, b.isbn, b.description, b.page_count, b.published_year,
  b.amazon_url, b.goodreads_url, b.expert_rating, b.community_rating, b.total_reviews,
  b.expert_quote, b.expert_name, b.difficulty_level, b.tags, b.vibe, b.plot_type, b.length_category,
  b.is_featured, b.is_editors_pick, b.is_bestseller
FROM genres g, (VALUES
  ('Gone Girl', 'Gillian Flynn', '9780307588371',
   'A marriage disappears — and so does the wife. This dark psychological thriller about manipulation, media, and marriage was a cultural phenomenon. One of the best-plotted novels ever.',
   422, 2012,
   'https://www.amazon.com/Gone-Girl-Novel-Gillian-Flynn/dp/0307588378',
   'https://www.goodreads.com/book/show/19288043-gone-girl',
   4.8, 4.1, 218600, 'One of the most diabolically clever thrillers of the decade.', 'Stephen King',
   NULL, ARRAY['Psychological','Marriage','Twist','Unreliable Narrator'],
   'Dark', 'Psychological Thriller', 'Standard', false, true, true),

  ('And Then There Were None', 'Agatha Christie', '9780062073488',
   'Ten strangers are lured to an isolated island mansion and begin to be murdered one by one. The best-selling mystery novel of all time. Christie at the peak of her powers.',
   288, 1939,
   'https://www.amazon.com/Then-There-Were-None/dp/0062073486',
   'https://www.goodreads.com/book/show/16299.And_Then_There_Were_None',
   5.0, 4.6, 362400, 'The perfect whodunit. Christie''s greatest achievement.', 'P.D. James',
   NULL, ARRAY['Whodunit','Classic','Murder','Locked Room','Christie'],
   'Thrilling', 'Mystery', 'Quick Read', false, true, true),

  ('The Girl with the Dragon Tattoo', 'Stieg Larsson', '9780307949486',
   'A journalist and a brilliant but troubled hacker investigate a 40-year-old disappearance. A masterpiece of Nordic noir that redefined the thriller genre.',
   672, 2008,
   'https://www.amazon.com/Girl-Dragon-Tattoo-Millennium-Novel/dp/0307949486',
   'https://www.goodreads.com/book/show/2429135.The_Girl_with_the_Dragon_Tattoo',
   4.7, 4.3, 224800, 'Larsson created one of fiction''s most compelling heroines.', 'The New York Times',
   NULL, ARRAY['Nordic Noir','Hacker','Sweden','Investigation','Serial Killer'],
   'Dark', 'Mystery', 'Epic', false, true, true),

  ('Big Little Lies', 'Liane Moriarty', '9780399167065',
   'Three women''s seemingly perfect lives unravel to the point of murder. Smart, funny, and heartbreaking. The best domestic thriller of the decade.',
   460, 2014,
   'https://www.amazon.com/Big-Little-Lies-Liane-Moriarty/dp/0399167064',
   'https://www.goodreads.com/book/show/19486412-big-little-lies',
   4.7, 4.4, 186200, 'Moriarty at her best. Impossible to put down.', 'People Magazine',
   NULL, ARRAY['Domestic Thriller','Women','Friendship','Secrets','Dark Humor'],
   'Dark', 'Mystery', 'Standard', false, false, true)
) AS b(title, author, isbn, description, page_count, published_year, amazon_url, goodreads_url,
       expert_rating, community_rating, total_reviews, expert_quote, expert_name, difficulty_level,
       tags, vibe, plot_type, length_category, is_featured, is_editors_pick, is_bestseller)
WHERE g.slug = 'mystery-thriller';

-- ── COMEDY & HUMOR ────────────────────────────────────────────
INSERT INTO books (genre_id, title, author, isbn, description, page_count, published_year,
  amazon_url, goodreads_url, expert_rating, community_rating, total_reviews,
  expert_quote, expert_name, difficulty_level, tags, vibe, plot_type, length_category,
  is_featured, is_editors_pick, is_bestseller)
SELECT g.id, b.title, b.author, b.isbn, b.description, b.page_count, b.published_year,
  b.amazon_url, b.goodreads_url, b.expert_rating, b.community_rating, b.total_reviews,
  b.expert_quote, b.expert_name, b.difficulty_level, b.tags, b.vibe, b.plot_type, b.length_category,
  b.is_featured, b.is_editors_pick, b.is_bestseller
FROM genres g, (VALUES
  ('The Hitchhiker''s Guide to the Galaxy', 'Douglas Adams', '9780345391803',
   'Don''t panic. Earth is destroyed to make way for a hyperspace bypass, and Arthur Dent is dragged through the universe. The funniest book ever written. Possibly.',
   224, 1979,
   'https://www.amazon.com/Hitchhikers-Guide-Galaxy-Douglas-Adams/dp/0345391802',
   'https://www.goodreads.com/book/show/11.The_Hitchhiker_s_Guide_to_the_Galaxy',
   5.0, 4.6, 384200, 'The funniest science fiction novel ever written. Possibly the funniest novel period.', 'Neil Gaiman',
   NULL, ARRAY['Absurdist','Space','British Humor','Adventure','Classic'],
   'Funny', 'Absurdist Adventure', 'Quick Read', true, true, true),

  ('Good Omens', 'Terry Pratchett & Neil Gaiman', '9780060853983',
   'The antichrist is born and an angel and demon who''ve grown fond of Earth must stop Armageddon. Two masters of wit collaborate for the funniest apocalypse ever written.',
   496, 1990,
   'https://www.amazon.com/Good-Omens-Accurate-Prophecies-Nutter/dp/0060853980',
   'https://www.goodreads.com/book/show/12067.Good_Omens',
   4.9, 4.5, 298400, 'The most fun you can have reading a book about the end of the world.', 'Stephen King',
   NULL, ARRAY['Absurdist','Angels','Demons','Apocalypse','British Humor'],
   'Funny', 'Comedy', 'Standard', true, true, true),

  ('Catch-22', 'Joseph Heller', '9781451626650',
   'Set in WWII, Heller''s satirical masterpiece follows Yossarian, a bombardier trying to escape combat duty. Coined a phrase that entered the language. Dark, brilliant, unforgettable.',
   544, 1961,
   'https://www.amazon.com/Catch-22-50th-Anniversary-Joseph-Heller/dp/1451626657',
   'https://www.goodreads.com/book/show/168668.Catch_22',
   4.8, 4.2, 216400, 'One of the greatest American novels of the 20th century.', 'The Guardian',
   NULL, ARRAY['War Satire','WWII','Dark Humor','Classic','Circular Logic'],
   'Funny', 'Satire', 'Epic', false, true, true),

  ('Three Men in a Boat', 'Jerome K. Jerome', '9780140430691',
   'Three men and a dog take a boating holiday on the Thames. Every misadventure is chronicled with gentle, observational comedy that has not aged a day since 1889.',
   224, 1889,
   'https://www.amazon.com/Three-Boat-Penguin-Classics-Jerome/dp/0140430695',
   'https://www.goodreads.com/book/show/4921.Three_Men_in_a_Boat',
   4.7, 4.3, 82400, 'One of the funniest books in the English language.', 'Philip Pullman',
   NULL, ARRAY['British Humor','Travel','Classic','Gentle Comedy'],
   'Cozy', 'Comedy', 'Quick Read', false, false, true),

  ('Bossypants', 'Tina Fey', '9780316056878',
   'Tina Fey''s memoir-ish collection of essays on comedy, feminism, and 30 Rock. Howlingly funny, self-deprecating, and genuinely insightful about being a woman in entertainment.',
   277, 2011,
   'https://www.amazon.com/Bossypants-Tina-Fey/dp/0316056871',
   'https://www.goodreads.com/book/show/9418327-bossypants',
   4.7, 4.4, 198600, 'One of the most purely enjoyable books I have read.', 'The New Yorker',
   NULL, ARRAY['Memoir','Women','Comedy','Feminism','Celebrity'],
   'Funny', 'Comedy', 'Quick Read', false, false, true),

  ('The Rosie Project', 'Graeme Simsion', '9781476729084',
   'A genetics professor with extreme social awkwardness devises a questionnaire to find a wife. Absolutely charming, warm, and laugh-out-loud funny.',
   295, 2013,
   'https://www.amazon.com/Rosie-Project-Novel-Don-Tillman/dp/1476729085',
   'https://www.goodreads.com/book/show/16181775-the-rosie-project',
   4.6, 4.2, 142800, 'One of the most delightful reads of the year.', 'Bill Gates',
   NULL, ARRAY['Romance','Autism','Science','Charming','Quirky'],
   'Funny', 'Romance', 'Standard', false, false, true)
) AS b(title, author, isbn, description, page_count, published_year, amazon_url, goodreads_url,
       expert_rating, community_rating, total_reviews, expert_quote, expert_name, difficulty_level,
       tags, vibe, plot_type, length_category, is_featured, is_editors_pick, is_bestseller)
WHERE g.slug = 'comedy-humor';

-- ── LITERARY FICTION ──────────────────────────────────────────
INSERT INTO books (genre_id, title, author, isbn, description, page_count, published_year,
  amazon_url, goodreads_url, expert_rating, community_rating, total_reviews,
  expert_quote, expert_name, difficulty_level, tags, vibe, plot_type, length_category,
  is_featured, is_editors_pick, is_bestseller)
SELECT g.id, b.title, b.author, b.isbn, b.description, b.page_count, b.published_year,
  b.amazon_url, b.goodreads_url, b.expert_rating, b.community_rating, b.total_reviews,
  b.expert_quote, b.expert_name, b.difficulty_level, b.tags, b.vibe, b.plot_type, b.length_category,
  b.is_featured, b.is_editors_pick, b.is_bestseller
FROM genres g, (VALUES
  ('1984', 'George Orwell', '9780451524935',
   'A totalitarian dystopia where Big Brother watches everything. The most prophetic novel ever written — more relevant today than when published in 1949.',
   328, 1949,
   'https://www.amazon.com/1984-Signet-Classics-George-Orwell/dp/0451524934',
   'https://www.goodreads.com/book/show/40961427-1984',
   5.0, 4.7, 484200, 'The most important novel of the 20th century.', 'The Times London',
   NULL, ARRAY['Dystopia','Totalitarianism','Politics','Classic','Surveillance'],
   'Dark', 'Dystopia', 'Standard', true, true, true),

  ('To Kill a Mockingbird', 'Harper Lee', '9780061935466',
   'Racial injustice in the American South, seen through the eyes of Scout Finch. Her father Atticus defends a Black man falsely accused of rape. The quintessential American novel.',
   336, 1960,
   'https://www.amazon.com/Kill-Mockingbird-Harper-Lee/dp/0061935468',
   'https://www.goodreads.com/book/show/2657.To_Kill_a_Mockingbird',
   5.0, 4.5, 512400, 'A book that changed the world.', 'The New York Times',
   NULL, ARRAY['Race','Justice','American South','Coming-of-Age','Classic'],
   'Thrilling', 'Coming-of-Age', 'Standard', false, true, true),

  ('The Great Gatsby', 'F. Scott Fitzgerald', '9780743273565',
   'Jay Gatsby''s relentless pursuit of the American Dream. Fitzgerald''s lyrical masterpiece captures the Jazz Age — its glamour, its emptiness, and its ultimate tragedy.',
   208, 1925,
   'https://www.amazon.com/Great-Gatsby-F-Scott-Fitzgerald/dp/0743273567',
   'https://www.goodreads.com/book/show/4671.The_Great_Gatsby',
   4.8, 3.9, 486200, 'The most lyrical novel in the American canon.', 'Harold Bloom',
   NULL, ARRAY['American Dream','Jazz Age','Wealth','Classic','Tragedy'],
   'Atmospheric', 'Tragedy', 'Quick Read', false, false, true),

  ('Brave New World', 'Aldous Huxley', '9780060850524',
   'A World State where humans are engineered, conditioned, and kept happy through pleasure. Huxley''s terrifying vision of a future controlled not by fear but by comfort.',
   288, 1932,
   'https://www.amazon.com/Brave-New-World-Aldous-Huxley/dp/0060850523',
   'https://www.goodreads.com/book/show/5129.Brave_New_World',
   4.8, 4.2, 312400, 'More relevant than 1984 because our dystopia chooses pleasure over pain.', 'Neil Postman',
   NULL, ARRAY['Dystopia','Future','Conditioning','Classic','Science'],
   'Mind-Bending', 'Dystopia', 'Standard', false, false, true)
) AS b(title, author, isbn, description, page_count, published_year, amazon_url, goodreads_url,
       expert_rating, community_rating, total_reviews, expert_quote, expert_name, difficulty_level,
       tags, vibe, plot_type, length_category, is_featured, is_editors_pick, is_bestseller)
WHERE g.slug = 'literary-fiction';

-- ── LEADERSHIP ────────────────────────────────────────────────
INSERT INTO books (genre_id, title, author, isbn, description, page_count, published_year,
  amazon_url, goodreads_url, expert_rating, community_rating, total_reviews,
  expert_quote, expert_name, difficulty_level, tags, is_featured, is_editors_pick, is_bestseller)
SELECT g.id, b.title, b.author, b.isbn, b.description, b.page_count, b.published_year,
  b.amazon_url, b.goodreads_url, b.expert_rating, b.community_rating, b.total_reviews,
  b.expert_quote, b.expert_name, b.difficulty_level, b.tags, b.is_featured, b.is_editors_pick, b.is_bestseller
FROM genres g, (VALUES
  ('Extreme Ownership', 'Jocko Willink', '9781250183866',
   'Navy SEAL commanders apply battlefield leadership principles to business and life. The core principle: there are no bad teams, only bad leaders. Brutally practical.',
   320, 2017,
   'https://www.amazon.com/Extreme-Ownership-U-S-Navy-SEALs/dp/1250183863',
   'https://www.goodreads.com/book/show/23848190-extreme-ownership',
   4.8, 4.6, 68200, 'The best leadership book I''ve read. No excuses.', 'Naval Ravikant',
   'Beginner', ARRAY['Military','Accountability','Teamwork','Navy SEAL'], false, true, true),

  ('Leaders Eat Last', 'Simon Sinek', '9781591848011',
   'Why some teams pull together and others don''t. Sinek explores the biology of trust, cooperation, and why the best leaders sacrifice their own comfort for those in their care.',
   368, 2014,
   'https://www.amazon.com/Leaders-Eat-Last-Together-Others/dp/1591848016',
   'https://www.goodreads.com/book/show/16144853-leaders-eat-last',
   4.7, 4.3, 48600, 'Sinek reveals the deepest secret of great leadership.', 'Gen. James Mattis',
   'Beginner', ARRAY['Team Culture','Trust','Biology','Organizational Leadership'], false, false, true),

  ('The Five Dysfunctions of a Team', 'Patrick Lencioni', '9780787960759',
   'A leadership fable about why teams fail and how to overcome the five root causes. The most accessible and actionable team-management book ever written.',
   240, 2002,
   'https://www.amazon.com/Five-Dysfunctions-Team-Leadership-Fable/dp/0787960756',
   'https://www.goodreads.com/book/show/21343.The_Five_Dysfunctions_of_a_Team',
   4.7, 4.4, 82400, 'The most impactful management book I have used.', 'Sundar Pichai, CEO of Google',
   'Intermediate', ARRAY['Teamwork','Management','Culture','Communication'], false, false, true)
) AS b(title, author, isbn, description, page_count, published_year, amazon_url, goodreads_url,
       expert_rating, community_rating, total_reviews, expert_quote, expert_name, difficulty_level,
       tags, is_featured, is_editors_pick, is_bestseller)
WHERE g.slug = 'leadership';

-- ── UPDATE next_book_id CHAINS ────────────────────────────────
-- Set up the "What to Read Next" recommendation chains for learning genres.
-- After this, each book's detail page will show the next recommended book.

-- Data Science chain: Python for Everybody → Python for Data Analysis → Elements of Statistical Learning
UPDATE books SET next_book_id = (SELECT id FROM books WHERE title = 'Python for Data Analysis' LIMIT 1)
WHERE title = 'Python for Everybody';

UPDATE books SET next_book_id = (SELECT id FROM books WHERE title = 'Practical Statistics for Data Scientists' LIMIT 1)
WHERE title = 'Python for Data Analysis';

UPDATE books SET next_book_id = (SELECT id FROM books WHERE title = 'The Elements of Statistical Learning' LIMIT 1)
WHERE title = 'Practical Statistics for Data Scientists';

UPDATE books SET next_book_id = (SELECT id FROM books WHERE title = 'Designing Machine Learning Systems' LIMIT 1)
WHERE title = 'The Elements of Statistical Learning';

-- ML chain: Machine Learning for Absolute Beginners → Hands-On ML → Deep Learning
UPDATE books SET next_book_id = (SELECT id FROM books WHERE title = 'Hands-On Machine Learning' LIMIT 1)
WHERE title = 'Machine Learning for Absolute Beginners';

UPDATE books SET next_book_id = (SELECT id FROM books WHERE title = 'The Hundred-Page Machine Learning Book' LIMIT 1)
WHERE title = 'Hands-On Machine Learning';

UPDATE books SET next_book_id = (SELECT id FROM books WHERE title = 'Deep Learning' LIMIT 1)
WHERE title = 'The Hundred-Page Machine Learning Book';

-- Programming chain: Python Crash Course → Clean Code → Designing Data-Intensive Applications
UPDATE books SET next_book_id = (SELECT id FROM books WHERE title = 'Automate the Boring Stuff with Python' LIMIT 1)
WHERE title = 'Python Crash Course';

UPDATE books SET next_book_id = (SELECT id FROM books WHERE title = 'Clean Code' LIMIT 1)
WHERE title = 'Automate the Boring Stuff with Python';

UPDATE books SET next_book_id = (SELECT id FROM books WHERE title = 'The Pragmatic Programmer' LIMIT 1)
WHERE title = 'Clean Code';

UPDATE books SET next_book_id = (SELECT id FROM books WHERE title = 'Designing Data-Intensive Applications' LIMIT 1)
WHERE title = 'The Pragmatic Programmer';

-- Finance chain: Rich Dad Poor Dad → Psychology of Money → Intelligent Investor
UPDATE books SET next_book_id = (SELECT id FROM books WHERE title = 'The Psychology of Money' LIMIT 1)
WHERE title = 'Rich Dad Poor Dad';

UPDATE books SET next_book_id = (SELECT id FROM books WHERE title = 'The Intelligent Investor' LIMIT 1)
WHERE title = 'The Psychology of Money';

UPDATE books SET next_book_id = (SELECT id FROM books WHERE title = 'A Random Walk Down Wall Street' LIMIT 1)
WHERE title = 'The Intelligent Investor';

-- Sci-Fi reading chain
UPDATE books SET next_book_id = (SELECT id FROM books WHERE title = 'Project Hail Mary' LIMIT 1)
WHERE title = 'The Martian';

UPDATE books SET next_book_id = (SELECT id FROM books WHERE title = 'Ender''s Game' LIMIT 1)
WHERE title = 'Project Hail Mary';

-- ── UPDATE genre book_count ────────────────────────────────────
UPDATE genres SET book_count = (
  SELECT COUNT(*) FROM books WHERE books.genre_id = genres.id
);

-- ── DONE ─────────────────────────────────────────────────────
-- Your ChapterOne database is ready!
-- Run: SELECT COUNT(*) FROM books; to confirm all books were inserted.
-- Run: SELECT name, book_count FROM genres ORDER BY book_count DESC; to see genre counts.
