import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
import requests
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

# Load environment variables from Next.js .env.local
script_dir = Path(__file__).resolve().parent
env_path = script_dir.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Could not find Supabase credentials in .env.local")
    sys.exit(1)

def fetch_books():
    print("Fetching books from Supabase...")
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }
    url = f"{SUPABASE_URL}/rest/v1/books?select=id,title,isbn,description&isbn=not.is.null"
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Failed to fetch books: {response.text}")
        sys.exit(1)
    return response.json()

def update_book_description(book_id, description):
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    url = f"{SUPABASE_URL}/rest/v1/books?id=eq.{book_id}"
    response = requests.patch(url, headers=headers, json={"description": description})
    return response.status_code in [200, 204]

def insert_review(book_id, comment, reviewer_name, reviewer_avatar):
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    url = f"{SUPABASE_URL}/rest/v1/reviews"
    payload = {
        "book_id": book_id,
        "rating": 5, # default
        "content": comment,
        "reviewer_name": reviewer_name,
        "source": "goodreads",
        "external_author_name": reviewer_name,
        "external_author_image_url": reviewer_avatar
    }
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code not in [201, 204]:
        print(f"      Failed to insert review: {response.text}")
        return False
    return True

def run():
    books = fetch_books()
    print(f"Found {len(books)} books with ISBNs. Launching browser...")

    with sync_playwright() as p:
        # Launch browser in visible mode to avoid Goodreads blocks
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = context.new_page()

        success_count = 0
        fail_count = 0

        for i, book in enumerate(books):
            isbn = book.get('isbn')
            if not isbn:
                continue
                
            clean_isbn = isbn.replace('-', '').replace(' ', '')
            
            print(f"[{i + 1}/{len(books)}] Scraping Goodreads for: \"{book.get('title')}\" (ISBN: {clean_isbn})")

            try:
                # Go to Goodreads search
                page.goto(f"https://www.goodreads.com/search?q={clean_isbn}", wait_until="domcontentloaded")
                
                # If it's a search page, click the first result
                if "search" in page.url:
                    result = page.query_selector('.bookTitle')
                    if result:
                        with page.expect_navigation():
                            result.click()
                    else:
                        print("  -> No results found on Goodreads.")
                        fail_count += 1
                        continue
                        
                # Wait a bit for React to load reviews and description
                page.wait_for_timeout(3000)
                
                # Scrape description
                current_desc = book.get('description') or ''
                if not current_desc or len(current_desc) < 20:
                    desc_el = page.query_selector('[data-testid="description"]')
                    if desc_el:
                        new_desc = desc_el.inner_text().strip()
                        if new_desc:
                            print("  -> Found description, updating database...")
                            update_book_description(book['id'], new_desc)
                
                # Scrape reviews
                reviews = page.query_selector_all('.ReviewCard')
                if reviews:
                    print(f"  -> Found {len(reviews)} reviews. Scraping top 3...")
                    for rev in reviews[:3]:
                        name_el = rev.query_selector('.ReviewerProfile__name')
                        avatar_el = rev.query_selector('.ReviewerProfile__avatar img')
                        text_el = rev.query_selector('.ReviewText__content')
                        
                        name = name_el.inner_text() if name_el else "Goodreads User"
                        avatar = avatar_el.get_attribute('src') if avatar_el else None
                        text = text_el.inner_text() if text_el else ""
                        
                        if text:
                            insert_review(book['id'], text, name, avatar)
                    success_count += 1
                else:
                    print("  -> No reviews found.")
                    fail_count += 1
                    
                # Pause to let the user see it and prevent instant bans
                page.wait_for_timeout(2000)

            except Exception as e:
                print(f"  -> Error: {e}")
                fail_count += 1

        print(f"\nFinished! Processed {success_count} books successfully. Failed: {fail_count}")
        browser.close()

if __name__ == '__main__':
    run()
