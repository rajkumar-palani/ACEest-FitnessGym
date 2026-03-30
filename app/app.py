"""
ACEest Fitness & Gym Management - Flask REST API
A comprehensive fitness gym management application with API endpoints
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime, date
from functools import wraps
import random
import os

app = Flask(__name__)
CORS(app)

DB_NAME = "aceest_fitness.db"

# ============== DATABASE INITIALIZATION ==============
def init_db():
    """Initialize database with required tables"""
    if not os.path.exists(DB_NAME):
        conn = sqlite3.connect(DB_NAME)
        cur = conn.cursor()

        # Users table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT,
            role TEXT
        )
        """)

        # Clients table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            age INTEGER,
            height REAL,
            weight REAL,
            program TEXT,
            calories INTEGER,
            target_weight REAL,
            target_adherence INTEGER,
            membership_status TEXT,
            membership_end TEXT
        )
        """)

        # Progress table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT,
            week TEXT,
            adherence INTEGER
        )
        """)

        # Workouts table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS workouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT,
            date TEXT,
            workout_type TEXT,
            duration_min INTEGER,
            notes TEXT
        )
        """)

        # Exercises table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS exercises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workout_id INTEGER,
            name TEXT,
            sets INTEGER,
            reps INTEGER,
            weight REAL
        )
        """)

        # Metrics table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT,
            date TEXT,
            weight REAL,
            waist REAL,
            bodyfat REAL
        )
        """)

        # Insert default admin user
        cur.execute("INSERT INTO users VALUES ('admin','admin','Admin')")
        cur.execute("INSERT INTO users VALUES ('trainer','trainer', 'Trainer')")

        conn.commit()
        conn.close()


def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        username = request.headers.get('X-Username')
        password = request.headers.get('X-Password')

        if not username or not password:
            return jsonify({'error': 'Missing authentication headers'}), 401

        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT role FROM users WHERE username=? AND password=?", (username, password))
        user = cur.fetchone()
        conn.close()

        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401

        return f(*args, **kwargs)
    return decorated


# ============== HEALTH CHECK ==============
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'ACEest API is running'}), 200


# ============== AUTHENTICATION ==============
@app.route('/api/login', methods=['POST'])
def login():
    """Login endpoint"""
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT role FROM users WHERE username=? AND password=?",
                (data['username'], data['password']))
    user = cur.fetchone()
    conn.close()

    if user:
        return jsonify({
            'message': 'Login successful',
            'username': data['username'],
            'role': user['role']
        }), 200

    return jsonify({'error': 'Invalid credentials'}), 401


# ============== CLIENT ENDPOINTS ==============
@app.route('/api/clients', methods=['GET'])
@require_auth
def get_clients():
    """Get all clients"""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM clients")
    clients = cur.fetchall()
    conn.close()

    return jsonify([dict(client) for client in clients]), 200


@app.route('/api/clients/<int:client_id>', methods=['GET'])
@require_auth
def get_client(client_id):
    """Get specific client"""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM clients WHERE id=?", (client_id,))
    client = cur.fetchone()
    conn.close()

    if not client:
        return jsonify({'error': 'Client not found'}), 404

    return jsonify(dict(client)), 200


@app.route('/api/clients', methods=['POST'])
@require_auth
def create_client():
    """Create new client"""
    data = request.get_json()

    if not data or not data.get('name'):
        return jsonify({'error': 'Missing client name'}), 400

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute("""
        INSERT INTO clients (name, age, height, weight, program, calories,
                           target_weight, target_adherence, membership_status, membership_end)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get('name'),
            data.get('age'),
            data.get('height'),
            data.get('weight'),
            data.get('program', ''),
            data.get('calories'),
            data.get('target_weight'),
            data.get('target_adherence'),
            data.get('membership_status', 'Active'),
            data.get('membership_end')
        ))

        conn.commit()
        client_id = cur.lastrowid
        conn.close()

        return jsonify({'message': 'Client created', 'client_id': client_id}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Client name already exists'}), 409


@app.route('/api/clients/<int:client_id>', methods=['PUT'])
@require_auth
def update_client(client_id):
    """Update client"""
    data = request.get_json()

    conn = get_db()
    cur = conn.cursor()

    # Check if client exists
    cur.execute("SELECT * FROM clients WHERE id=?", (client_id,))
    if not cur.fetchone():
        conn.close()
        return jsonify({'error': 'Client not found'}), 404

    update_fields = []
    update_values = []

    for field in ['name', 'age', 'height', 'weight', 'program', 'calories',
                  'target_weight', 'target_adherence', 'membership_status', 'membership_end']:
        if field in data:
            update_fields.append(f"{field}=?")
            update_values.append(data[field])

    if not update_fields:
        conn.close()
        return jsonify({'error': 'No fields to update'}), 400

    update_values.append(client_id)
    query = f"UPDATE clients SET {', '.join(update_fields)} WHERE id=?"

    try:
        cur.execute(query, update_values)
        conn.commit()
        conn.close()
        return jsonify({'message': 'Client updated'}), 200
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Duplicate name'}), 409


@app.route('/api/clients/<int:client_id>', methods=['DELETE'])
@require_auth
def delete_client(client_id):
    """Delete client"""
    conn = get_db()
    cur = conn.cursor()

    cur.execute("DELETE FROM clients WHERE id=?", (client_id,))

    if cur.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Client not found'}), 404

    conn.commit()
    conn.close()

    return jsonify({'message': 'Client deleted'}), 200


# ============== WORKOUT ENDPOINTS ==============
@app.route('/api/workouts', methods=['GET'])
@require_auth
def get_workouts():
    """Get all workouts"""
    client_name = request.args.get('client_name')

    conn = get_db()
    cur = conn.cursor()

    if client_name:
        cur.execute("SELECT * FROM workouts WHERE client_name=? ORDER BY date DESC", (client_name,))
    else:
        cur.execute("SELECT * FROM workouts ORDER BY date DESC")

    workouts = cur.fetchall()
    conn.close()

    return jsonify([dict(w) for w in workouts]), 200


@app.route('/api/workouts/<int:workout_id>', methods=['GET'])
@require_auth
def get_workout(workout_id):
    """Get specific workout"""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM workouts WHERE id=?", (workout_id,))
    workout = cur.fetchone()
    conn.close()

    if not workout:
        return jsonify({'error': 'Workout not found'}), 404

    return jsonify(dict(workout)), 200


@app.route('/api/workouts', methods=['POST'])
@require_auth
def create_workout():
    """Create new workout"""
    data = request.get_json()

    required_fields = ['client_name', 'date', 'workout_type']
    if not data or not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO workouts (client_name, date, workout_type, duration_min, notes)
    VALUES (?, ?, ?, ?, ?)
    """, (
        data['client_name'],
        data['date'],
        data['workout_type'],
        data.get('duration_min', 0),
        data.get('notes', '')
    ))

    conn.commit()
    workout_id = cur.lastrowid
    conn.close()

    return jsonify({'message': 'Workout created', 'workout_id': workout_id}), 201


@app.route('/api/workouts/<int:workout_id>', methods=['PUT'])
@require_auth
def update_workout(workout_id):
    """Update workout"""
    data = request.get_json()

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT * FROM workouts WHERE id=?", (workout_id,))
    if not cur.fetchone():
        conn.close()
        return jsonify({'error': 'Workout not found'}), 404

    update_fields = []
    update_values = []

    for field in ['client_name', 'date', 'workout_type', 'duration_min', 'notes']:
        if field in data:
            update_fields.append(f"{field}=?")
            update_values.append(data[field])

    if not update_fields:
        conn.close()
        return jsonify({'error': 'No fields to update'}), 400

    update_values.append(workout_id)
    query = f"UPDATE workouts SET {', '.join(update_fields)} WHERE id=?"

    cur.execute(query, update_values)
    conn.commit()
    conn.close()

    return jsonify({'message': 'Workout updated'}), 200


@app.route('/api/workouts/<int:workout_id>', methods=['DELETE'])
@require_auth
def delete_workout(workout_id):
    """Delete workout"""
    conn = get_db()
    cur = conn.cursor()

    cur.execute("DELETE FROM workouts WHERE id=?", (workout_id,))

    if cur.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Workout not found'}), 404

    conn.commit()
    conn.close()

    return jsonify({'message': 'Workout deleted'}), 200


# ============== METRICS ENDPOINTS ==============
@app.route('/api/metrics', methods=['GET'])
@require_auth
def get_metrics():
    """Get all metrics"""
    client_name = request.args.get('client_name')

    conn = get_db()
    cur = conn.cursor()

    if client_name:
        cur.execute("SELECT * FROM metrics WHERE client_name=? ORDER BY date DESC", (client_name,))
    else:
        cur.execute("SELECT * FROM metrics ORDER BY date DESC")

    metrics = cur.fetchall()
    conn.close()

    return jsonify([dict(m) for m in metrics]), 200


@app.route('/api/metrics', methods=['POST'])
@require_auth
def create_metric():
    """Create new metric"""
    data = request.get_json()

    if not data or not data.get('client_name') or not data.get('date'):
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO metrics (client_name, date, weight, waist, bodyfat)
    VALUES (?, ?, ?, ?, ?)
    """, (
        data['client_name'],
        data['date'],
        data.get('weight'),
        data.get('waist'),
        data.get('bodyfat')
    ))

    conn.commit()
    metric_id = cur.lastrowid
    conn.close()

    return jsonify({'message': 'Metric created', 'metric_id': metric_id}), 201


# ============== PROGRESS ENDPOINTS ==============
@app.route('/api/progress', methods=['GET'])
@require_auth
def get_progress():
    """Get progress data"""
    client_name = request.args.get('client_name')

    conn = get_db()
    cur = conn.cursor()

    if client_name:
        cur.execute("SELECT * FROM progress WHERE client_name=? ORDER BY id", (client_name,))
    else:
        cur.execute("SELECT * FROM progress ORDER BY id")

    progress = cur.fetchall()
    conn.close()

    return jsonify([dict(p) for p in progress]), 200


@app.route('/api/progress', methods=['POST'])
@require_auth
def create_progress():
    """Create progress entry"""
    data = request.get_json()

    required = ['client_name', 'week', 'adherence']
    if not data or not all(field in data for field in required):
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO progress (client_name, week, adherence)
    VALUES (?, ?, ?)
    """, (data['client_name'], data['week'], data['adherence']))

    conn.commit()
    progress_id = cur.lastrowid
    conn.close()

    return jsonify({'message': 'Progress created', 'progress_id': progress_id}), 201


# ============== PROGRAM GENERATOR ==============
@app.route('/api/generate-program/<int:client_id>', methods=['POST'])
@require_auth
def generate_program(client_id):
    """Generate AI program for client"""
    program_templates = {
        "Fat Loss": ["Full Body HIIT", "Circuit Training", "Cardio + Weights"],
        "Muscle Gain": ["Push/Pull/Legs", "Upper/Lower Split", "Full Body Strength"],
        "Beginner": ["Full Body 3x/week", "Light Strength + Mobility"]
    }

    program_type = random.choice(list(program_templates.keys()))
    program_detail = random.choice(program_templates[program_type])

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT * FROM clients WHERE id=?", (client_id,))
    if not cur.fetchone():
        conn.close()
        return jsonify({'error': 'Client not found'}), 404

    cur.execute("UPDATE clients SET program=? WHERE id=?", (program_detail, client_id))
    conn.commit()
    conn.close()

    return jsonify({
        'message': 'Program generated',
        'program_type': program_type,
        'program': program_detail
    }), 200


# ============== ERROR HANDLERS ==============
@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Resource not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    # init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
