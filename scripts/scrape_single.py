import os
import sys
import argparse
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

def update_book_description(book_id, description):
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    url = f"{SUPABASE_URL}/rest/v1/books?id=eq.{book_id}"
    requests.patch(url, headers=headers, json={"description": description, "goodreads_scraped": True})

def mark_as_scraped(book_id):
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    url = f"{SUPABASE_URL}/rest/v1/books?id=eq.{book_id}"
    requests.patch(url, headers=headers, json={"goodreads_scraped": True})


def run():
    parser = argparse.ArgumentParser(description="Scrape Goodreads for a single book.")
    parser.add_argument('--id', required=True, help="Supabase Book ID")
    parser.add_argument('--isbn', required=True, help="Book ISBN")
    args = parser.parse_args()

    book_id = args.id
    isbn = args.isbn.replace('-', '').replace(' ', '')
    
    print(f"Scraping Goodreads for ISBN: {isbn}")

    with sync_playwright() as p:
        # Launch browser in headless mode to be invisible and fast
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = context.new_page()

        try:
            # Go to Goodreads search
            page.goto(f"https://www.goodreads.com/search?q={isbn}", wait_until="domcontentloaded")
            
            # If it's a search page, click the first result
            if "search" in page.url:
                result = page.query_selector('.bookTitle')
                if result:
                    with page.expect_navigation():
                        result.click()
                else:
                    print("No results found on Goodreads.")
                    mark_as_scraped(book_id)
                    browser.close()
                    sys.exit(0)
                    
            # Wait a bit for React to load reviews and description
            page.wait_for_timeout(3000)
            
            # Scrape description
            desc_el = page.query_selector('[data-testid="description"]')
            if desc_el:
                new_desc = desc_el.inner_text().strip()
                if new_desc:
                    print("Found description, updating database...")
                    update_book_description(book_id, new_desc)
            

            mark_as_scraped(book_id)

        except Exception as e:
            print(f"Error: {e}")
            mark_as_scraped(book_id)

        browser.close()

if __name__ == '__main__':
    run()
