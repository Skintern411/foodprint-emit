import os
import sys
import traceback
import csv
import uuid
from datetime import datetime
from flask import Blueprint, request, session, redirect, url_for, render_template, flash, jsonify
from functools import wraps

# Create blueprint for user authentication
user_auth_bp = Blueprint('user_auth', __name__)

# Path to the users CSV file
USERS_CSV_PATH = 'users.csv'
EMISSIONS_HISTORY_PATH = 'emissions_history.csv'

# CSV Headers
USER_CSV_HEADERS = ['User ID', 'Name', 'Phone Number', 'Join Date', 'Points']
EMISSIONS_HEADERS = ['User ID', 'Date', 'Bill Type', 'Description', 'Emissions', 'Unit', 'Rewards']

def log_debug(message):
    """Log debug messages with timestamp"""
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[DEBUG {timestamp}] {message}", file=sys.stderr)
    sys.stderr.flush()  


# Ensure CSV files exist
def ensure_csv_files():
    # Ensure users CSV exists
    if not os.path.exists(USERS_CSV_PATH):
        with open(USERS_CSV_PATH, 'w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow(USER_CSV_HEADERS)
    
    # Ensure emissions history CSV exists
    if not os.path.exists(EMISSIONS_HISTORY_PATH):
        with open(EMISSIONS_HISTORY_PATH, 'w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow(EMISSIONS_HEADERS)

# Initialize files
ensure_csv_files()

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('user_auth.login'))
        return f(*args, **kwargs)
    return decorated_function

# Get next user ID
# Update this function in user_auth.py
def get_next_user_id():
    try:
        with open(USERS_CSV_PATH, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            header = next(reader)  # Skip header row
            
            # Find the column index for User ID
            user_id_index = 0
            for i, column in enumerate(header):
                if column.lower() in ['user id', 'userid', 'id']:
                    user_id_index = i
                    break
            
            # Get the maximum User ID
            max_id = 0
            for row in reader:
                if row and row[user_id_index].isdigit():
                    user_id = int(row[user_id_index])
                    if user_id > max_id:
                        max_id = user_id
            
            # Return the next ID in sequence
            return max_id + 1
    except Exception as e:
        print(f"Error getting next user ID: {str(e)}")
        return 1
    
# Find user by name and phone
# Update this function in user_auth.py
def find_user(name, phone):
    try:
        with open(USERS_CSV_PATH, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            header = next(reader)
            
            # Find column indexes
            user_id_index = name_index = phone_index = join_date_index = points_index = -1
            
            for i, column in enumerate(header):
                column_lower = column.lower()
                if 'user id' in column_lower or 'userid' in column_lower:
                    user_id_index = i
                elif 'name' in column_lower:
                    name_index = i
                elif 'phone' in column_lower:
                    phone_index = i
                elif 'join' in column_lower and 'date' in column_lower:
                    join_date_index = i
                elif 'point' in column_lower:
                    points_index = i
            
            # Search for the user
            for row in reader:
                if (row and 
                    name_index >= 0 and phone_index >= 0 and 
                    row[name_index].lower() == name.lower() and 
                    row[phone_index] == phone):
                    
                    # Create user object
                    user = {
                        'id': row[user_id_index] if user_id_index >= 0 else '',
                        'name': row[name_index] if name_index >= 0 else name,
                        'phone': row[phone_index] if phone_index >= 0 else phone,
                        'join_date': row[join_date_index] if join_date_index >= 0 else '',
                        'points': int(row[points_index]) if points_index >= 0 and row[points_index].isdigit() else 0
                    }
                    return user
        return None
    except Exception as e:
        print(f"Error finding user: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return None
    
# Create new user
# Update this function in user_auth.py
def create_user(name, phone):
    try:
        # Log the operation
        log_debug(f"Attempting to create new user: {name}, {phone}")
        
        # Check if CSV file exists
        if not os.path.exists(USERS_CSV_PATH):
            log_debug(f"CSV file not found at: {os.path.abspath(USERS_CSV_PATH)}")
            # Create the file with headers if it doesn't exist
            with open(USERS_CSV_PATH, 'w', newline='', encoding='utf-8') as file:
                writer = csv.writer(file)
                writer.writerow(['User ID', 'Name', 'Phone Number', 'Join Date', 'Points'])
            log_debug(f"Created new CSV file at: {os.path.abspath(USERS_CSV_PATH)}")
        
        # Get next user ID
        user_id = get_next_user_id()
        log_debug(f"Generated new user ID: {user_id}")
        
        # Get current date
        join_date = datetime.now().strftime('%Y-%m-%d')
        
        # Check file permissions
        file_path = os.path.abspath(USERS_CSV_PATH)
        if os.path.exists(file_path):
            log_debug(f"File exists at {file_path}")
            log_debug(f"File permissions: {oct(os.stat(file_path).st_mode)[-3:]}")
            log_debug(f"File is writeable: {os.access(file_path, os.W_OK)}")
        
        # Read the header to match the format
        with open(USERS_CSV_PATH, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            header = next(reader)
            log_debug(f"CSV Headers: {header}")
        
        # Prepare new user data
        user_row = [str(user_id), name, phone, join_date, "0"]
        log_debug(f"New user row: {user_row}")
        
        # Write to CSV - explicitly open in append mode
        with open(USERS_CSV_PATH, 'a', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow(user_row)
            log_debug(f"User data written to CSV")
        
        # Verify the write operation
        user_found = False
        with open(USERS_CSV_PATH, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)  # Skip header
            for row in reader:
                if row and row[0] == str(user_id):
                    user_found = True
                    break
        
        if user_found:
            log_debug(f"Verified user was added to CSV")
        else:
            log_debug(f"WARNING: User not found in CSV after write operation")
        
        # Create and return user object
        user = {
            'id': str(user_id),
            'name': name,
            'phone': phone,
            'join_date': join_date,
            'points': 0
        }
        return user
        
    except Exception as e:
        error_trace = traceback.format_exc()
        log_debug(f"Error creating user: {str(e)}\n{error_trace}")
        return None
    

# Update user points
# Update this function in user_auth.py
def update_user_points(user_id, additional_points):
    try:
        log_debug(f"Updating points for user {user_id}, adding {additional_points} points")
        
        # Check if file exists
        if not os.path.exists(USERS_CSV_PATH):
            log_debug(f"CSV file not found at: {os.path.abspath(USERS_CSV_PATH)}")
            return False, 0
        
        # Read all users
        rows = []
        user_found = False
        updated_points = 0
        
        with open(USERS_CSV_PATH, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            header = next(reader)
            rows.append(header)
            
            # Find relevant column indices
            user_id_index = None
            points_index = None
            
            for i, col in enumerate(header):
                col_lower = col.lower()
                if 'user id' in col_lower or 'userid' in col_lower:
                    user_id_index = i
                elif 'point' in col_lower:
                    points_index = i
            
            log_debug(f"Headers: {header}")
            log_debug(f"User ID column index: {user_id_index}, Points column index: {points_index}")
            
            if user_id_index is None or points_index is None:
                log_debug("Could not find required columns in CSV")
                return False, 0
            
            # Process each row
            for row in reader:
                if row and row[user_id_index] == str(user_id):
                    log_debug(f"Found user {user_id} in CSV: {row}")
                    current_points = int(row[points_index]) if row[points_index].isdigit() else 0
                    updated_points = current_points + additional_points
                    row[points_index] = str(updated_points)
                    user_found = True
                    log_debug(f"Updated points from {current_points} to {updated_points}")
                
                rows.append(row)
        
        if not user_found:
            log_debug(f"User {user_id} not found in CSV")
            return False, 0
        
        # Write back all users
        with open(USERS_CSV_PATH, 'w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerows(rows)
            log_debug(f"Updated CSV file with new points")
        
        # Verify the update
        verification_success = False
        with open(USERS_CSV_PATH, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            next(reader)  # Skip header
            for row in reader:
                if row and row[user_id_index] == str(user_id):
                    if row[points_index] == str(updated_points):
                        verification_success = True
                        log_debug(f"Verified points update in CSV")
                    break
        
        if not verification_success:
            log_debug(f"WARNING: Points update verification failed")
        
        return True, updated_points
    except Exception as e:
        error_trace = traceback.format_exc()
        log_debug(f"Error updating user points: {str(e)}\n{error_trace}")
        return False, 0
    
    
# Save emission history
def save_emission_history(user_id, bill_type, description, emissions, unit, rewards):
    try:
        date = datetime.now().strftime('%Y-%m-%d')
        
        with open(EMISSIONS_HISTORY_PATH, 'a', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow([user_id, date, bill_type, description, emissions, unit, rewards])
        
        return True
    except Exception as e:
        print(f"Error saving emission history: {str(e)}")
        return False

# Get user's emission history
def get_user_emission_history(user_id):
    try:
        history = []
        
        with open(EMISSIONS_HISTORY_PATH, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                if row['User ID'] == str(user_id):
                    history.append({
                        'date': row['Date'],
                        'bill_type': row['Bill Type'],
                        'description': row['Description'],
                        'emissions': float(row['Emissions']),
                        'unit': row['Unit'],
                        'rewards': int(row['Rewards'])
                    })
        
        return history
    except Exception as e:
        print(f"Error getting emission history: {str(e)}")
        return []

# Routes
@user_auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        phone = request.form.get('phone', '').strip()
        
        if not name or not phone:
            flash('Please enter both name and phone number', 'error')
            return render_template('login.html')
        
        # Find existing user or create new one
        user = find_user(name, phone)
        
        if not user:
            user = create_user(name, phone)
            if not user:
                flash('Error creating new user account', 'error')
                return render_template('login.html')
        
        # Set user session
        session['user_id'] = user['id']
        session['user_name'] = user['name']
        session['user_phone'] = user['phone']
        session['user_points'] = user['points']
        
        return redirect(url_for('index'))
    
    return render_template('login.html')

@user_auth_bp.route('/logout')
def logout():
    # Clear session
    session.pop('user_id', None)
    session.pop('user_name', None)
    session.pop('user_phone', None)
    session.pop('user_points', None)
    
    return redirect(url_for('index'))

@user_auth_bp.route('/history')
@login_required
def user_history():
    user_id = session.get('user_id')
    history = get_user_emission_history(user_id)
    
    return jsonify({
        'success': True,
        'history': history
    })

@user_auth_bp.route('/save-result', methods=['POST'])
@login_required
def save_result():
    try:
        user_id = session.get('user_id')
        data = request.json
        
        bill_type = data.get('bill_type')
        description = data.get('description')
        emissions = float(data.get('emissions', 0))
        unit = data.get('unit', 'kg CO2e')
        rewards = int(data.get('rewards', 0))
        
        # Save to emission history
        save_success = save_emission_history(
            user_id, bill_type, description, emissions, unit, rewards
        )
        
        if not save_success:
            return jsonify({
                'success': False,
                'error': 'Failed to save emission history'
            }), 500
        
        # Update user points
        update_success, updated_points = update_user_points(user_id, rewards)
        
        if not update_success:
            return jsonify({
                'success': False,
                'error': 'Failed to update user points'
            }), 500
        
        # Update session
        session['user_points'] = updated_points
        
        return jsonify({
            'success': True,
            'message': 'Result saved successfully',
            'updated_points': updated_points
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error saving result: {str(e)}'
        }), 500