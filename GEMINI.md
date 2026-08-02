Build Running Territory – A Gamified Running Social Network (Full-Stack MERN)

You are an expert senior software engineer and product designer. Your task is to build a production-quality MVP called Running Territory.

Project Goal

Running Territory is not just another running tracker. It is a gamified social fitness platform where every run expands the user's territory on a map.

Imagine combining:

Strava
Pokémon GO
Civilization
Google Maps

The core philosophy is:

Every run should have a purpose.

Instead of only tracking distance and pace, users gradually explore and "claim" the world through their runs.

Tech Stack

Frontend

React (Vite)
React Router
Tailwind CSS
Axios
Leaflet
OpenStreetMap

Backend

Node.js
Express
MongoDB
Mongoose
JWT Authentication
bcrypt
Cloudinary (profile images)
dotenv

Architecture

Separate frontend and backend folders
Clean scalable folder structure
Modular code
MVC architecture
Environment variables
Proper error handling
Input validation
RESTful APIs
Authentication

Implement complete authentication.

Features

Register
Login
Logout
JWT authentication
Protected routes
Password hashing with bcrypt

Each user stores

name
username
email
hashed password
profile picture
bio
joined date
total distance
total runs
longest run
average pace
current streak
Dashboard

After login users reach their dashboard.

Display

Welcome message
Total runs
Total distance
Average pace
Current streak
Recent runs
Start Run button
Profile

Create a complete profile page.

Display

Profile photo
Username
Bio
Joined date
Total distance
Total runs
Longest run
Average pace
Current streak
Territory owned (basic)
Recent runs

Allow editing

Name
Bio
Profile picture
Start Run

Create a dedicated running screen.

When user presses Start Run

The application should

Ask GPS permission
Start timer
Begin recording coordinates
Record latitude
Record longitude
Record timestamps
Continuously update map

Display live

Distance
Duration
Current pace
Average pace
Current speed
Calories burned (estimated)
Interactive map
Pause button
Resume button
Finish button
Finish Run

When Finish is pressed

Calculate

Total distance
Total duration
Average speed
Average pace
Calories burned

Save

Route coordinates
Statistics
Date
User reference

Store everything in MongoDB.

Runs

Each run should have

distance
duration
average pace
average speed
calories
route coordinates
created date

Create

GET

POST

DELETE endpoints.

Run History

Create a page listing all previous runs.

Each card displays

Distance
Time
Pace
Calories
Date

Clicking a run opens the detail page.

Run Detail Page

Display

Interactive route map
Full statistics
Route coordinates
Distance
Duration
Pace
Calories
Date
Territory System (Core USP)

This is the unique feature.

Every completed run should create explored territory.

For the MVP:

Save all GPS coordinates.
Display explored routes on the user's map in a distinct color.
Visually indicate which roads or paths the user has already explored.
Build the data model so multiple users can later own or contest territory.

Do not implement competitive ownership yet—only the user's own explored territory.

Statistics Dashboard

Create a dashboard showing

Total runs
Total distance
Weekly distance
Monthly distance
Average pace
Longest run
Calories burned
Current streak

Use clean cards and simple charts if appropriate.

Maps

Use

Leaflet + OpenStreetMap

Features

Live tracking
Route drawing
Saved routes
Zoom
User marker
Database Models

User

Run

Territory

Design schemas so future collections can easily be added for

Likes
Comments
Followers
Challenges
Notifications
Achievements
Backend API

Authentication

POST /register

POST /login

GET /me

Users

GET /users/

PUT /users/

Runs

POST /runs

GET /runs

GET /runs/

DELETE /runs/

Territory

GET /territory

POST /territory

UI Requirements

Modern

Clean

Minimal

Responsive

Mobile-first

Smooth animations where appropriate

Dark mode support

Use Tailwind CSS.

Folder Structure

Create a professional project structure with clearly separated frontend and backend.

Include

Frontend

components
pages
hooks
services
context
assets
utils

Backend

controllers
routes
middleware
models
config
utils
services
Code Quality

Requirements

Reusable components
Custom hooks where useful
Clean naming conventions
Comments only where necessary
No duplicated code
Proper loading states
Error handling
Validation
Async/await
Environment variables
Production-ready architecture
README

Generate a comprehensive README including

Project overview
Features
Screenshots placeholders
Installation
Environment variables
Running locally
API documentation
Folder structure
Future roadmap