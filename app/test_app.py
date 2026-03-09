"""
ACEest Fitness & Gym Management - Unit Tests
Comprehensive test suite for Flask API endpoints using Pytest
"""

import pytest
import json
import sys
import os

# Add app directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import app, init_db, DB_NAME
import sqlite3


@pytest.fixture
def client():
    """Create a test client and initialize database"""
    app.config['TESTING'] = True

    # Remove old test database if exists
    if os.path.exists(DB_NAME):
        os.remove(DB_NAME)

    # Initialize fresh database
    init_db()

    with app.test_client() as test_client:
        yield test_client

    # Cleanup
    if os.path.exists(DB_NAME):
        os.remove(DB_NAME)


@pytest.fixture
def auth_headers():
    """Return authentication headers"""
    return {
        'X-Username': 'admin',
        'X-Password': 'admin',
        'Content-Type': 'application/json'
    }


class TestHealthCheck:
    """Test health check endpoint"""

    def test_health_check(self, client):
        """Test health check endpoint returns 200"""
        response = client.get('/health')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'


class TestAuthentication:
    """Test authentication endpoints"""

    def test_login_success(self, client):
        """Test successful login"""
        response = client.post('/api/login', json={
            'username': 'admin',
            'password': 'admin'
        })
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['username'] == 'admin'
        assert data['role'] == 'Admin'

    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials"""
        response = client.post('/api/login', json={
            'username': 'invalid',
            'password': 'wrong'
        })
        assert response.status_code == 401

    def test_login_missing_fields(self, client):
        """Test login with missing fields"""
        response = client.post('/api/login', json={
            'username': 'admin'
        })
        assert response.status_code == 400

    def test_login_empty_body(self, client):
        """Test login with empty body"""
        response = client.post('/api/login', json={})
        assert response.status_code == 400


class TestClientEndpoints:
    """Test client management endpoints"""

    def test_get_clients_empty(self, client, auth_headers):
        """Test getting clients when none exist"""
        response = client.get('/api/clients', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == []

    def test_get_clients_unauthorised(self, client):
        """Test getting clients without auth headers"""
        response = client.get('/api/clients')
        assert response.status_code == 401

    def test_create_client(self, client, auth_headers):
        """Test creating a new client"""
        response = client.post('/api/clients', headers=auth_headers, json={
            'name': 'John Doe',
            'age': 30,
            'height': 1.80,
            'weight': 85,
            'calories': 2500,
            'target_weight': 80,
            'target_adherence': 90,
            'membership_status': 'Active'
        })
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['message'] == 'Client created'

    def test_create_client_missing_name(self, client, auth_headers):
        """Test creating client without name"""
        response = client.post('/api/clients', headers=auth_headers, json={
            'age': 30
        })
        assert response.status_code == 400

    def test_create_duplicate_client(self, client, auth_headers):
        """Test creating duplicate client"""
        # Create first client
        client.post('/api/clients', headers=auth_headers, json={
            'name': 'John Doe',
            'age': 30
        })

        # Try to create duplicate
        response = client.post('/api/clients', headers=auth_headers, json={
            'name': 'John Doe',
            'age': 25
        })
        assert response.status_code == 409

    def test_get_client_by_id(self, client, auth_headers):
        """Test getting specific client"""
        # Create a client first
        create_response = client.post('/api/clients', headers=auth_headers, json={
            'name': 'Jane Smith',
            'age': 28,
            'height': 1.65,
            'weight': 65
        })

        client_id = json.loads(create_response.data)['client_id']

        # Get the client
        response = client.get(f'/api/clients/{client_id}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['name'] == 'Jane Smith'
        assert data['age'] == 28

    def test_get_nonexistent_client(self, client, auth_headers):
        """Test getting non-existent client"""
        response = client.get('/api/clients/999', headers=auth_headers)
        assert response.status_code == 404

    def test_update_client(self, client, auth_headers):
        """Test updating client"""
        # Create client
        create_response = client.post('/api/clients', headers=auth_headers, json={
            'name': 'Bob Wilson',
            'age': 35,
            'weight': 90
        })
        client_id = json.loads(create_response.data)['client_id']

        # Update client
        response = client.put(f'/api/clients/{client_id}', headers=auth_headers, json={
            'age': 36,
            'weight': 88
        })
        assert response.status_code == 200

        # Verify update
        get_response = client.get(f'/api/clients/{client_id}', headers=auth_headers)
        data = json.loads(get_response.data)
        assert data['age'] == 36
        assert data['weight'] == 88

    def test_update_nonexistent_client(self, client, auth_headers):
        """Test updating non-existent client"""
        response = client.put('/api/clients/999', headers=auth_headers, json={
            'age': 30
        })
        assert response.status_code == 404

    def test_delete_client(self, client, auth_headers):
        """Test deleting client"""
        # Create client
        create_response = client.post('/api/clients', headers=auth_headers, json={
            'name': 'Alice Johnson',
            'age': 27
        })
        client_id = json.loads(create_response.data)['client_id']

        # Delete client
        response = client.delete(f'/api/clients/{client_id}', headers=auth_headers)
        assert response.status_code == 200

        # Verify deletion
        get_response = client.get(f'/api/clients/{client_id}', headers=auth_headers)
        assert get_response.status_code == 404

    def test_delete_nonexistent_client(self, client, auth_headers):
        """Test deleting non-existent client"""
        response = client.delete('/api/clients/999', headers=auth_headers)
        assert response.status_code == 404


class TestWorkoutEndpoints:
    """Test workout management endpoints"""

    def test_get_workouts_empty(self, client, auth_headers):
        """Test getting workouts when none exist"""
        response = client.get('/api/workouts', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == []

    def test_create_workout(self, client, auth_headers):
        """Test creating a workout"""
        response = client.post('/api/workouts', headers=auth_headers, json={
            'client_name': 'John Doe',
            'date': '2026-03-09',
            'workout_type': 'Strength',
            'duration_min': 60,
            'notes': 'Good session'
        })
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['message'] == 'Workout created'

    def test_create_workout_missing_required(self, client, auth_headers):
        """Test creating workout without required fields"""
        response = client.post('/api/workouts', headers=auth_headers, json={
            'client_name': 'John Doe'
        })
        assert response.status_code == 400

    def test_get_workout_by_id(self, client, auth_headers):
        """Test getting specific workout"""
        # Create workout
        create_response = client.post('/api/workouts', headers=auth_headers, json={
            'client_name': 'Jane Smith',
            'date': '2026-03-08',
            'workout_type': 'Cardio',
            'duration_min': 45
        })
        workout_id = json.loads(create_response.data)['workout_id']

        # Get workout
        response = client.get(f'/api/workouts/{workout_id}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['client_name'] == 'Jane Smith'

    def test_get_workouts_by_client(self, client, auth_headers):
        """Test getting workouts for specific client"""
        # Create workouts
        client.post('/api/workouts', headers=auth_headers, json={
            'client_name': 'John',
            'date': '2026-03-09',
            'workout_type': 'Strength'
        })
        client.post('/api/workouts', headers=auth_headers, json={
            'client_name': 'Jane',
            'date': '2026-03-09',
            'workout_type': 'Cardio'
        })

        # Get John's workouts
        response = client.get('/api/workouts?client_name=John', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data) == 1
        assert data[0]['client_name'] == 'John'

    def test_update_workout(self, client, auth_headers):
        """Test updating workout"""
        # Create workout
        create_response = client.post('/api/workouts', headers=auth_headers, json={
            'client_name': 'Bob',
            'date': '2026-03-07',
            'workout_type': 'Strength',
            'duration_min': 60
        })
        workout_id = json.loads(create_response.data)['workout_id']

        # Update
        response = client.put(f'/api/workouts/{workout_id}', headers=auth_headers, json={
            'duration_min': 75,
            'notes': 'Extended session'
        })
        assert response.status_code == 200

        # Verify
        get_response = client.get(f'/api/workouts/{workout_id}', headers=auth_headers)
        data = json.loads(get_response.data)
        assert data['duration_min'] == 75

    def test_delete_workout(self, client, auth_headers):
        """Test deleting workout"""
        # Create workout
        create_response = client.post('/api/workouts', headers=auth_headers, json={
            'client_name': 'Alice',
            'date': '2026-03-06',
            'workout_type': 'Mobility'
        })
        workout_id = json.loads(create_response.data)['workout_id']

        # Delete
        response = client.delete(f'/api/workouts/{workout_id}', headers=auth_headers)
        assert response.status_code == 200

        # Verify
        get_response = client.get(f'/api/workouts/{workout_id}', headers=auth_headers)
        assert get_response.status_code == 404


class TestMetricsEndpoints:
    """Test metrics management endpoints"""

    def test_get_metrics_empty(self, client, auth_headers):
        """Test getting metrics when none exist"""
        response = client.get('/api/metrics', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == []

    def test_create_metric(self, client, auth_headers):
        """Test creating a metric"""
        response = client.post('/api/metrics', headers=auth_headers, json={
            'client_name': 'John Doe',
            'date': '2026-03-09',
            'weight': 85.5,
            'waist': 90,
            'bodyfat': 22.5
        })
        assert response.status_code == 201

    def test_create_metric_missing_required(self, client, auth_headers):
        """Test creating metric without required fields"""
        response = client.post('/api/metrics', headers=auth_headers, json={
            'client_name': 'John Doe'
        })
        assert response.status_code == 400

    def test_get_metrics_by_client(self, client, auth_headers):
        """Test getting metrics for specific client"""
        # Create metrics
        client.post('/api/metrics', headers=auth_headers, json={
            'client_name': 'John',
            'date': '2026-03-09',
            'weight': 85
        })
        client.post('/api/metrics', headers=auth_headers, json={
            'client_name': 'Jane',
            'date': '2026-03-09',
            'weight': 65
        })

        # Get John's metrics
        response = client.get('/api/metrics?client_name=John', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data) == 1
        assert data[0]['client_name'] == 'John'


class TestProgressEndpoints:
    """Test progress tracking endpoints"""

    def test_get_progress_empty(self, client, auth_headers):
        """Test getting progress when none exist"""
        response = client.get('/api/progress', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data == []

    def test_create_progress(self, client, auth_headers):
        """Test creating progress entry"""
        response = client.post('/api/progress', headers=auth_headers, json={
            'client_name': 'John Doe',
            'week': 'Week 1',
            'adherence': 95
        })
        assert response.status_code == 201

    def test_create_progress_missing_required(self, client, auth_headers):
        """Test creating progress without required fields"""
        response = client.post('/api/progress', headers=auth_headers, json={
            'client_name': 'John Doe'
        })
        assert response.status_code == 400

    def test_get_progress_by_client(self, client, auth_headers):
        """Test getting progress for specific client"""
        # Create progress entries
        client.post('/api/progress', headers=auth_headers, json={
            'client_name': 'John',
            'week': 'Week 1',
            'adherence': 90
        })
        client.post('/api/progress', headers=auth_headers, json={
            'client_name': 'Jane',
            'week': 'Week 1',
            'adherence': 85
        })

        # Get John's progress
        response = client.get('/api/progress?client_name=John', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data) == 1
        assert data[0]['client_name'] == 'John'


class TestProgramGenerator:
    """Test program generation endpoint"""

    def test_generate_program_success(self, client, auth_headers):
        """Test successful program generation"""
        # Create client first
        create_response = client.post('/api/clients', headers=auth_headers, json={
            'name': 'Test Client',
            'age': 30
        })
        client_id = json.loads(create_response.data)['client_id']

        # Generate program
        response = client.post(f'/api/generate-program/{client_id}', headers=auth_headers)
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'program' in data
        assert 'program_type' in data

    def test_generate_program_nonexistent_client(self, client, auth_headers):
        """Test program generation for non-existent client"""
        response = client.post('/api/generate-program/999', headers=auth_headers)
        assert response.status_code == 404


class TestErrorHandling:
    """Test error handling"""

    def test_404_error(self, client, auth_headers):
        """Test 404 error handling"""
        response = client.get('/api/nonexistent', headers=auth_headers)
        assert response.status_code == 404

    def test_missing_auth_headers(self, client):
        """Test missing authentication headers"""
        response = client.get('/api/clients')
        assert response.status_code == 401
