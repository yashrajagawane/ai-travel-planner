import os
import requests
from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from app.models import User, Plan
from app import db
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Create a blueprint for routes
routes_bp = Blueprint('routes', __name__)

# API Keys for Trip and Weather
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
TRIPMAP_API_KEY = "5ae2e3f221c38a28845f05b60a339f36bd2e48ff06daa20928a400e2"
WEATHER_API_KEY = "d44b13edaa2146c6a9f70137251310"


# --- Google AI (Gemini) Configuration ---
model = None
if GOOGLE_API_KEY:
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        # Use the model name confirmed to work with your key
        model = genai.GenerativeModel('gemini-pro-latest')
        print("✅ Google AI Model configured successfully.")
    except Exception as e:
        print(f"❌ Error configuring Google AI: {e}")
else:
    print("⚠️ GOOGLE_API_KEY not found in .env file. AI suggestions will not work.")



@routes_bp.route('/suggestions', methods=['GET', 'POST'])
def suggestions():
    response_text = None
    error_message = None

    if not model:
        error_message = "AI model is not configured. Please check your GOOGLE_API_KEY."
        return render_template('suggestions.html', response=response_text, error=error_message)

    if request.method == 'POST':
        place = request.form.get('place')
        duration = request.form.get('days')
        interests = request.form.get('interests')

        if not all([place, duration, interests]):
            error_message = "All fields (Place, Days, Interests) are required."
        else:
            # UPDATED PROMPT: Asks for a more interactive and fun tone with emojis.
            prompt = f"""
            Create a detailed and engaging travel itinerary for a trip to {place} for {duration} days for a traveler interested in {interests}.
            Your entire response MUST be formatted in Markdown.
            - Use a main heading (#) for the trip title.
            - Use subheadings (##) for each day's plan (e.g., ## Day 1: Arrival and Exploration).
            - Use bullet points (*) for activities, sights, and food recommendations.
            - Use bold text (**) for important names and places (e.g., **The Taj Mahal Palace**).
            - Keep a fun, conversational tone and use relevant emojis (like ✈️, 🍽️, 🏛️, 🏞️).
            add proper spacing and line breaks for readability.
            spacing and line breaks are important for readability.
            """
            try:
                api_response = model.generate_content(prompt)
                response_text = api_response.text
            except Exception as e:
                print(f"Error calling Gemini API: {e}")
                error_message = f"An error occurred while contacting the AI: {e}"

    return render_template('suggestions.html', response=response_text, error=error_message)


# Function to check login
def login_required():
    return 'user_id' not in session

# Home and Dashboard Pages
@routes_bp.route('/')
def home():
    return render_template('login.html')


@routes_bp.route('/dashboard')
def dashboard():
    # Show dashboard only if user is logged in
    if login_required():
        return redirect(url_for('routes.home'))
    return render_template('dashboard.html')


# Signup, Login, and Logout
@routes_bp.route('/signup', methods=['POST'])
def signup():
    # Get user details from frontend
    data = request.get_json()

    # Check if all required details are given
    required = ['name', 'surname', 'email', 'phone', 'gender', 'password']
    if not data or not all(key in data for key in required):
        return jsonify(success=False, message="Please fill all details"), 400

    # Check if user already exists
    existing_user = User.query.filter(
        (User.email == data['email']) | (User.phone == data['phone'])
    ).first()

    if existing_user:
        return jsonify(success=False, message="User already registered!"), 409

    # Create and save new user in database
    new_user = User(
        name=data['name'],
        surname=data['surname'],
        email=data['email'],
        phone=data['phone'],
        gender=data['gender'],
        password=generate_password_hash(data['password'])  # Save password securely
    )

    db.session.add(new_user)  # Add to session
    db.session.commit()       # Save changes to DB

    return jsonify(success=True, message="Signup successful! Please login."), 201


@routes_bp.route('/login', methods=['POST'])
def login():
    # Get phone and password from frontend
    data = request.get_json()
    user = User.query.filter_by(phone=data.get('phone')).first()

    # Check if user exists and password is correct
    if user and check_password_hash(user.password, data.get('password')):
        session['user_id'] = user.id  # Save login info in session
        return jsonify(success=True, message="Login successful!")
    else:
        return jsonify(success=False, message="Wrong phone or password!"), 401


@routes_bp.route('/logout')
def logout():
    # Logout user by clearing session
    session.pop('user_id', None)
    return redirect(url_for('routes.home'))


# Trip Plan Management
@routes_bp.route('/add_plan', methods=['POST'])
def add_plan():
    # Only logged-in user can add a plan
    if login_required():
        return jsonify(success=False, message="Login required"), 401

    data = request.get_json()
    required = ['currentLocation', 'destinations', 'date', 'budget']

    # Check if all data is given
    if not data or not all(key in data for key in required):
        return jsonify(success=False, message="Please fill all fields"), 400

    # Create a new trip plan and save it
    new_plan = Plan(
        current_location=data['currentLocation'],
        destination=", ".join(data['destinations']),
        date=data['date'],
        budget=data.get('budget', 'Not Mentioned'),
        user_id=session['user_id']
    )

    db.session.add(new_plan)
    db.session.commit()
    return jsonify(success=True, message="Trip plan saved successfully!"), 201


@routes_bp.route('/update_plan/<int:id>', methods=['PUT'])
def update_plan(id):
    # Update an existing trip plan
    if login_required():
        return jsonify(success=False, message="Login required"), 401

    plan = Plan.query.filter_by(id=id, user_id=session['user_id']).first()

    if not plan:
        return jsonify(success=False, message="Plan not found!"), 404

    # Update only the provided fields
    data = request.get_json()
    if 'current_location' in data:
        plan.current_location = data['current_location']
    if 'destination' in data:
        plan.destination = data['destination']
    if 'date' in data:
        plan.date = data['date']
    if 'budget' in data:
        plan.budget = data['budget']

    db.session.commit()
    return jsonify(success=True, message="Plan updated successfully!")


@routes_bp.route('/delete_plan/<int:id>', methods=['DELETE'])
def delete_plan(id):
    # Delete a plan from database
    if login_required():
        return jsonify(success=False, message="Login required"), 401

    plan = Plan.query.filter_by(id=id, user_id=session['user_id']).first()

    if not plan:
        return jsonify(success=False, message="Plan not found!"), 404

    db.session.delete(plan)
    db.session.commit()
    return jsonify(success=True, message="Plan deleted successfully!"), 200



# Other Pages (My Plans, Profile, etc.)
@routes_bp.route('/my_plans')
def my_plans():
    # Show all saved plans for user
    if login_required():
        return redirect(url_for('routes.home'))

    user = User.query.get(session['user_id'])
    plans = Plan.query.filter_by(user_id=user.id).all()
    return render_template("my_plans.html", plans=plans, user=user)


@routes_bp.route('/profile')
def profile():
    # Show user profile
    if login_required():
        return redirect(url_for('routes.home'))

    user = User.query.get(session['user_id'])
    return render_template("profile.html", user=user)


@routes_bp.route('/search_spots')
def search_spots():
    # Page to search tourist spots
    if login_required():
        return redirect(url_for('routes.home'))
    return render_template("Search_Spot.html")




# API Calls (TripMap + Weather)
@routes_bp.route('/api/search_spots')
def api_search_spots():
    # Search popular places using OpenTripMap API
    if login_required():
        return jsonify(error="Login required"), 401

    query = request.args.get('q', '')
    if len(query) < 3:
        return jsonify([]), 200

    try:
        # Get latitude and longitude of the city
        geo_url = f"https://api.opentripmap.com/0.1/en/places/geoname?name={query}&apikey={TRIPMAP_API_KEY}"
        geo_data = requests.get(geo_url, timeout=10).json()

        if 'lat' not in geo_data:
            return jsonify([])

        # Get nearby tourist spots
        lat, lon = geo_data['lat'], geo_data['lon']
        places_url = (
            f"https://api.opentripmap.com/0.1/en/places/radius?"
            f"lat={lat}&lon={lon}&radius=20000&kinds=interesting_places&rate=3&limit=7"
            f"&format=json&apikey={TRIPMAP_API_KEY}"
        )
        places_data = requests.get(places_url, timeout=10).json()
        return jsonify([p for p in places_data if p.get('name')])

    except Exception as e:
        return jsonify(error=str(e)), 500


@routes_bp.route("/weather", methods=["GET", "POST"])
def weather():
    # Show current weather using API
    if login_required():
        return redirect(url_for('routes.home'))

    weather_data, error = None, None

    if request.method == "POST":
        city = request.form.get("city")

        if not city:
            error = "Please enter a city."
        else:
            try:
                # API call to get weather details
                url = f"https://api.weatherapi.com/v1/current.json?key={WEATHER_API_KEY}&q={city}&aqi=no"
                response = requests.get(url, timeout=10)
                response.raise_for_status()
                data = response.json()

                weather_data = {
                    "city": data["location"]["name"],
                    "country": data["location"]["country"],
                    "temp": data["current"]["temp_c"],
                    "condition": data["current"]["condition"]["text"],
                    "icon": data["current"]["condition"]["icon"],
                }

            except requests.exceptions.HTTPError as e:
                error = f"HTTP Error: {e.response.reason}"
            except Exception:
                error = "Error fetching weather data."

    return render_template("weather.html", weather=weather_data, error=error)
