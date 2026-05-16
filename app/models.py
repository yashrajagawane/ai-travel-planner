from app import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    surname = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    gender = db.Column(db.String(10), nullable=False)
    password = db.Column(db.String(150), nullable=False)
    plans = db.relationship('Plan', backref='user', lazy=True, cascade="all, delete-orphan")

class Plan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    current_location = db.Column(db.String(200), nullable=False)
    destination = db.Column(db.Text, nullable=False)
    date = db.Column(db.String(20), nullable=False)
    budget = db.Column(db.String(50), nullable=True) # Added budget field
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

