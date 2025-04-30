from pymongo import MongoClient
import bcrypt

# Connect to MongoDB
mongo_uri = "mongodb://localhost:27017/spam_sniffer"  # Adjust this to your Mongo URI
client = MongoClient(mongo_uri)
db = client.spam_sniffer
users = db.users

# Data for the new user (you can change these values)
username = "admin"
email = "admin@example.com"
password = "password"  # Use plain text for now, will hash it

# Hash the password before storing it in MongoDB
hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

# Insert the new user into the 'users' collection
users.insert_one({
    "username": username,
    "email": email,
    "password": hashed_pw,
    "gmails": []  # You can add some Gmail accounts here if needed
})

print("User created successfully")
