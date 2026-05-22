import aiohttp
import asyncio
import json
import re
import time
from bs4 import BeautifulSoup

NOT_FOUND_STRINGS = [
    'page not found', 'user not found', 'account not found',
    'profile not found', 'does not exist', "doesn't exist",
    'no user', 'not exist', "couldn't find", 'could not find',
    'no account', 'invalid user', 'user does not exist',
    'пользователь не найден', 'страница не найдена',
    'такого пользователя нет', 'профиль не найден',
    'користувача не знайдено', 'сторінку не знайдено',
    '404 not found', 'sorry, this page', 'suspended',
]

class ThunderChecker:
    def __init__(self, username, socketio=None, strict=False):
        self.username = username
        self.socketio = socketio
        self.strict = strict
        self.results = []
        with open('data/sites.json', 'r', encoding='utf-8') as f:
            self.sites = json.load(f)

    async def check_site(self, session, site):
        url = site['url'].format(username=self.username)
        confidence = 'low'
        found = False
        avatar = None
        location = None
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10),
                                   allow_redirects=True, ssl=False) as response:
                final_url = str(response.url).lower()
                username_lower = self.username.lower()
                if response.status == 404:
                    found = False
                elif response.status == 200:
                    if username_lower not in final_url:
                        found = False
                    else:
                        text = await response.text()
                        text_lower = text.lower()
                        if any(nf in text_lower for nf in NOT_FOUND_STRINGS):
                            found = False
                        elif username_lower in text_lower:
                            if site.get('check_string'):
                                check = site['check_string'].lower()
                                if check == 'og:title':
                                    title_match = re.search(r'<title[^>]*>(.*?)</title>',
                                                           text, re.IGNORECASE | re.DOTALL)
                                    if title_match and username_lower in title_match.group(1).lower():
                                        found = True
                                        confidence = 'high'
                                    else:
                                        found = False
                                elif check in text_lower:
                                    found = True
                                    confidence = 'high'
                                else:
                                    found = False
                            else:
                                if self.strict:
                                    title_match = re.search(r'<title[^>]*>(.*?)</title>',
                                                           text, re.IGNORECASE | re.DOTALL)
                                    if title_match and username_lower in title_match.group(1).lower():
                                        found = True
                                        confidence = 'medium'
                                    else:
                                        found = False
                                else:
                                    found = True
                                    confidence = 'medium'
                        else:
                            found = False
                        if found:
                            try:
                                soup = BeautifulSoup(text, 'html.parser')
                                if site.get('avatar_selector'):
                                    img = soup.select_one(site['avatar_selector'])
                                    if img:
                                        avatar = img.get('src') or img.get('data-src')
                                location_selectors = ['[data-testid="UserLocation"]',
                                    '[itemprop="addressLocality"]', '.p-label', '.location',
                                    '.user-location', '.profile-location', '[class*="location"]',
                                    '[class*="Location"]', '[class*="city"]', '[class*="Country"]']
                                for sel in location_selectors:
                                    el = soup.select_one(sel)
                                    if el:
                                        loc_text = el.get_text(strip=True)
                                        if loc_text and len(loc_text) > 1:
                                            location = loc_text
                                            break
                            except:
                                pass
                else:
                    found = False
        except asyncio.TimeoutError:
            found = False
        except Exception:
            found = False
        result = {
            'name': site['name'], 'url': url, 'found': found,
            'confidence': confidence, 'category': site.get('category', 'other'),
            'country': site.get('country', '🌍'), 'avatar': avatar, 'location': location
        }
        if self.socketio and found:
            self.socketio.emit('result', result)
        return result

    async def check_all(self):
        start_time = time.time()
        connector = aiohttp.TCPConnector(limit=50, ssl=False)
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        async with aiohttp.ClientSession(connector=connector, headers=headers) as session:
            tasks = [self.check_site(session, site) for site in self.sites]
            total = len(tasks)
            completed = 0
            for coro in asyncio.as_completed(tasks):
                result = await coro
                self.results.append(result)
                completed += 1
                if self.socketio:
                    self.socketio.emit('progress', {'completed': completed, 'total': total,
                                                    'percent': int((completed / total) * 100)})
        elapsed = round(time.time() - start_time, 2)
        if self.socketio:
            self.socketio.emit('done', {'total': total,
                'found': len([r for r in self.results if r['found']]), 'time': elapsed})
        return self.results
