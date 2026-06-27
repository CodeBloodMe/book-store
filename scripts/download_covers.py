import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
import requests
import re
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

# Ensure covers directory exists
COVERS_DIR = script_dir.parent.parent / 'cover-server' / 'covers' / 'isbn'
COVERS_DIR.mkdir(parents=True, exist_ok=True)

def fetch_books():
    print("Fetching books from Supabase...")
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    }
    # Query all books where isbn is not null
    url = f"{SUPABASE_URL}/rest/v1/books?select=id,title,isbn&isbn=not.is.null"
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Failed to fetch books: {response.text}")
        sys.exit(1)
    return response.json()

def run():
    books = fetch_books()
    print(f"Found {len(books)} books with ISBNs. Launching browser...")

    with sync_playwright() as p:
        # Launch browser in visible mode
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
            file_name = f"{clean_isbn}-L.jpg"
            file_path = COVERS_DIR / file_name

            # Skip if already downloaded
            if file_path.exists():
                continue

            print(f"[{i + 1}/{len(books)}] Searching Goodreads for: \"{book.get('title')}\" (ISBN: {clean_isbn})")

            try:
                # Go to Goodreads search
                page.goto(f"https://www.goodreads.com/search?q={clean_isbn}", wait_until="domcontentloaded")
                
                # Look for Goodreads cover
                gr_image = page.query_selector('.BookCover__image img, .bookCoverPrimary img, img#coverImage')
                
                if gr_image:
                    src = gr_image.get_attribute('src')
                    if src and 'nophoto' not in src:
                        print("  -> Found image on Goodreads! Downloading...")
                        # Replace 'i' or 'm' size marker in goodreads URL to get 'l' (large) if possible, or just download
                        high_res_url = re.sub(r'([im])(/[^/]+\.jpg)$', r'l\2', src)
                        
                        img_res = requests.get(high_res_url)
                        if img_res.status_code == 200:
                            file_path.write_bytes(img_res.content)
                            print(f"  -> Successfully saved: {file_name}")
                            success_count += 1
                            continue
                        else:
                            print(f"  -> Download failed with status {img_res.status_code}")
                else:
                    print("  -> Not found on Goodreads. Trying Amazon...")
                    
                # If Goodreads fails, fallback to Amazon
                if not file_path.exists():
                    page.goto(f"https://www.amazon.com/s?k={clean_isbn}", wait_until="domcontentloaded")
                    
                    # Look for the first product image
                    image_element = page.query_selector('.s-image')
                    
                    if image_element:
                        src = image_element.get_attribute('src')
                        if src:
                            # Amazon images: https://m.media-amazon.com/images/I/81x%2B8O-r3hL._AC_UY218_.jpg
                            high_res_url = re.sub(r'\._[^_]+_\.jpg$', '.jpg', src)
                            
                            print("  -> Found image on Amazon! Downloading...")
                            
                            img_res = requests.get(high_res_url)
                            if img_res.status_code == 200:
                                file_path.write_bytes(img_res.content)
                                print(f"  -> Successfully saved: {file_name}")
                                success_count += 1
                            else:
                                print(f"  -> Download failed with status {img_res.status_code}")
                                fail_count += 1
                    else:
                        print("  -> No image found on Amazon either.")
                        fail_count += 1
                    
                # Pause to let the user see it and prevent instant bans
                page.wait_for_timeout(1500)

            except Exception as e:
                print(f"  -> Error: {e}")
                fail_count += 1

        print(f"\nFinished! Downloaded {success_count} new covers via browser automation. Failed: {fail_count}")
        browser.close()

if __name__ == '__main__':
    run()
