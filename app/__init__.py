import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)

    # Config
    basedir = os.path.abspath(os.path.dirname(__file__))
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, '../database.db')
    app.config['SECRET_KEY'] = 'your_secret_key'

    # Init db
    db.init_app(app)

    # Register blueprints
    from app.routes import routes_bp
    app.register_blueprint(routes_bp)

    with app.app_context():
        db.create_all()

    return app
