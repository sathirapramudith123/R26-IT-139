from app.core.database import MongoDB

def get_db():
    return MongoDB.get_database()
