import os
import csv
from functools import wraps
from flask import Blueprint, render_template, request, redirect, url_for, session, jsonify, current_app

# Create Blueprint for admin routes
admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

# Admin authentication settings
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "eco2024"

# Path to the users CSV file
USERS_CSV_PATH = r'users.csv'

# Login required decorator
def admin_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_logged_in' not in session:
            return redirect(url_for('admin.login'))
        return f(*args, **kwargs)
    return decorated_function

# Admin login route
@admin_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session['admin_logged_in'] = True
            return redirect(url_for('admin.dashboard'))
        else:
            return render_template('admin_login.html', error='Invalid credentials')
    
    return render_template('admin_login.html')

# Admin logout route
@admin_bp.route('/logout')
def logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('index'))

# Admin dashboard
@admin_bp.route('/')
@admin_login_required
def dashboard():
    return render_template('admin.html')


@admin_bp.route('/delete-user/<user_id>', methods=['DELETE'])
@admin_login_required
def delete_user(user_id):
    try:
        csv_path = USERS_CSV_PATH
        
        if not os.path.exists(csv_path):
            return jsonify({
                'success': False,
                'error': f'CSV file not found at {os.path.abspath(csv_path)}'
            }), 404
        
        # Read all users
        rows = []
        user_found = False
        
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            header = next(reader)
            rows.append(header)
            
            # Find the user and exclude them from rows
            for row in reader:
                if row and row[0] == str(user_id):
                    user_found = True
                else:
                    rows.append(row)
        
        if not user_found:
            return jsonify({
                'success': False,
                'error': f'User with ID {user_id} not found'
            }), 404
        
        # Write back all users except the deleted one
        with open(csv_path, 'w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerows(rows)
        
        # Also delete user data from emissions history
        try:
            emissions_csv_path = 'emissions_history.csv'
            if os.path.exists(emissions_csv_path):
                emissions_rows = []
                
                with open(emissions_csv_path, 'r', encoding='utf-8') as file:
                    reader = csv.reader(file)
                    header = next(reader)
                    emissions_rows.append(header)
                    
                    # Keep only rows that don't belong to the deleted user
                    for row in reader:
                        if row and row[0] != str(user_id):
                            emissions_rows.append(row)
                
                # Write back the filtered emissions data
                with open(emissions_csv_path, 'w', newline='', encoding='utf-8') as file:
                    writer = csv.writer(file)
                    writer.writerows(emissions_rows)
        except Exception as e:
            # Log but don't fail if emissions history deletion fails
            print(f"Warning: Could not delete emission history for user {user_id}: {str(e)}")
        
        return jsonify({
            'success': True,
            'message': f'User with ID {user_id} has been successfully deleted'
        }), 200
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error deleting user: {str(e)}")
        print(error_details)
        
        return jsonify({
            'success': False,
            'error': f'Error deleting user: {str(e)}',
            'details': error_details
        }), 500


# Get users data API
@admin_bp.route('/users')
@admin_login_required
def get_users():
    try:
        # Read user data from CSV file
        users = []
        csv_path = USERS_CSV_PATH
        
        if not os.path.exists(csv_path):
            return jsonify({
                'success': False,
                'error': f'CSV file not found at {os.path.abspath(csv_path)}',
                'users': []
            }), 404
        
        # Read the CSV file
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                # Based on your CSV format, map fields correctly 
                user = {
                    'id': row.get('User ID', ''),
                    'name': row.get('Name', ''),
                    'phone': row.get('Phone Number', ''),
                    'join_date': row.get('Join Date', ''),
                    'points': 0  # Default value
                }
                
                # Parse points as integer
                try:
                    points_str = str(row.get('Points', '0')).strip()
                    user['points'] = int(points_str) if points_str else 0
                except (ValueError, TypeError):
                    user['points'] = 0
                
                # Add active status (not in your CSV, so default to true)
                user['active'] = True
                
                users.append(user)
        
        return jsonify({
            'success': True,
            'users': users
        }), 200
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error reading CSV: {str(e)}")
        print(error_details)
        
        return jsonify({
            'success': False,
            'error': f'Error processing user data: {str(e)}',
            'details': error_details,
            'users': []
        }), 500