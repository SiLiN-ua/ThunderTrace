from flask import Flask, render_template, request, jsonify, send_file
from flask_socketio import SocketIO, emit
import asyncio
import json
import os
import csv
import io
from datetime import datetime
import requests as req
from core.checker import ThunderChecker

app = Flask(__name__)
app.config['SECRET_KEY'] = 'thundertrace_secret_key'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# История поиска
search_history = []

def generate_variations(username):
    v = []
    # С подчёркиваниями
    v.append(username + '_')
    v.append('_' + username)
    v.append('_' + username + '_')
    v.append(username + '__')
    # С точками
    v.append(username + '.')
    v.append('.' + username)
    # С цифрами
    v.append(username + '1')
    v.append(username + '2')
    v.append(username + '0')
    v.append(username + '123')
    v.append(username + '_1')
    v.append(username + '_2')
    # Убираем спецсимволы
    clean = username.replace('_', '').replace('.', '').replace('-', '')
    if clean != username and len(clean) > 1:
        v.append(clean)
    # Замена символов
    if '_' in username:
        v.append(username.replace('_', '.'))
        v.append(username.replace('_', ''))
    if '.' in username:
        v.append(username.replace('.', '_'))
        v.append(username.replace('.', ''))
    # Официальные
    v.append(username + '_official')
    v.append(username + '.ua')
    return [x for x in list(set(v)) if x != username and len(x) > 1][:10]

def generate_similar(username):
    s = []
    if len(username) > 3:
        s.append(username[:-1])
        s.append(username[1:])
    s.append(username + username[-1])
    s.append(username + username[-2:])
    # Замена букв
    s.append(username.replace('i', 'y'))
    s.append(username.replace('y', 'i'))
    return [x for x in list(set(s)) if x != username and len(x) > 1][:4]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/search', methods=['POST'])
def search():
    data = request.json
    usernames = data.get('usernames', [])
    use_variations = data.get('variations', False)
    use_similar = data.get('similar', False)
    if isinstance(usernames, str):
        usernames = [usernames]

    all_usernames = list(usernames)
    extra = []

    for u in usernames:
        if use_variations:
            extra += generate_variations(u)
        if use_similar:
            extra += generate_similar(u)

    for e in extra:
        if e not in all_usernames:
            all_usernames.append(e)

    results = {}
    is_variation = False
    for username in all_usernames:
        is_variation = username not in usernames
        checker = ThunderChecker(username, socketio, strict=is_variation)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(checker.check_all())
        results[username] = result

        found_results = [r for r in result if r['found']]
        # Сохраняем только оригинальные ники или вариации с находками
        if username in usernames or found_results:
            search_history.append({
                'id': len(search_history),
                'username': username + (' (variation)' if username not in usernames else ''),
                'date': datetime.now().strftime('%Y-%m-%d %H:%M'),
                'found': len(found_results),
                'results': found_results
            })

    return jsonify(results)

@app.route('/api/history')
def get_history():
    return jsonify(search_history[-50:])

@app.route('/api/history/delete/<int:idx>', methods=['DELETE'])
def delete_history(idx):
    global search_history
    search_history = [h for h in search_history if h.get('id') != idx]
    return jsonify({'status': 'ok'})

@app.route('/api/history/clear', methods=['DELETE'])
def clear_history():
    search_history.clear()
    return jsonify({'status': 'ok'})

@app.route('/api/export/json', methods=['POST'])
def export_json():
    data = request.json
    filename = f"thundertrace_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    filepath = os.path.join('exports', filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return send_file(filepath, as_attachment=True)

@app.route('/api/export/csv', methods=['POST'])
def export_csv():
    data = request.json
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Username', 'Platform', 'URL', 'Found', 'Confidence', 'Country'])
    for username, results in data.items():
        for r in results:
            writer.writerow([
                username,
                r.get('name', ''),
                r.get('url', ''),
                r.get('found', False),
                r.get('confidence', ''),
                r.get('country', '')
            ])
    output.seek(0)
    filename = f"thundertrace_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    filepath = os.path.join('exports', filename)
    with open(filepath, 'w', encoding='utf-8', newline='') as f:
        f.write(output.getvalue())
    return send_file(filepath, as_attachment=True)

SITES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'sites.json')

@app.route('/api/sites/custom', methods=['GET'])
def get_custom_sites():
    with open(SITES_FILE, 'r', encoding='utf-8') as f:
        sites = json.load(f)
    custom = [s for s in sites if s.get('custom')]
    return jsonify(custom)

@app.route('/api/sites/custom', methods=['POST'])
def add_custom_site():
    site = request.json
    if not site.get('name') or not site.get('url'):
        return jsonify({'status': 'error', 'message': 'Name and URL required'}), 400
    if '{username}' not in site.get('url', ''):
        return jsonify({'status': 'error', 'message': 'URL must contain {username}'}), 400
    with open(SITES_FILE, 'r', encoding='utf-8') as f:
        sites = json.load(f)
    # Перевірка дублів
    names = [s['name'].lower() for s in sites]
    if site['name'].lower() in names:
        return jsonify({'status': 'error', 'message': 'Site with this name already exists'}), 400
    site['custom'] = True
    sites.append(site)
    with open(SITES_FILE, 'w', encoding='utf-8') as f:
        json.dump(sites, f, ensure_ascii=False, indent=2)
    return jsonify({'status': 'ok'})

@app.route('/api/sites/custom/<name>', methods=['DELETE'])
def delete_custom_site(name):
    with open(SITES_FILE, 'r', encoding='utf-8') as f:
        sites = json.load(f)
    sites = [s for s in sites if not (s.get('custom') and s['name'] == name)]
    with open(SITES_FILE, 'w', encoding='utf-8') as f:
        json.dump(sites, f, ensure_ascii=False, indent=2)
    return jsonify({'status': 'ok'})

@app.route('/api/geocode', methods=['POST'])
def geocode():
    location = request.json.get('location', '')
    if not location:
        return jsonify({'error': 'empty'})
    try:
        r = req.get(
            'https://nominatim.openstreetmap.org/search',
            params={'q': location, 'format': 'json', 'limit': 1},
            headers={'User-Agent': 'ThunderTrace/1.0'},
            timeout=5
        )
        data = r.json()
        if data:
            return jsonify({
                'lat': float(data[0]['lat']),
                'lon': float(data[0]['lon']),
                'display_name': data[0]['display_name']
            })
    except:
        pass
    return jsonify({'error': 'not found'})

if __name__ == '__main__':
    os.makedirs('exports', exist_ok=True)
    socketio.run(app, debug=True, port=5000, host='0.0.0.0')