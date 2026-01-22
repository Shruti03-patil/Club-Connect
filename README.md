# Club-Connect
College Club Coordination, Event Planning, and Engagement Platform

---

## Team Details

Team Name: Club Connectors  
Team Leader: Om Kulkarni  
Event: TechSprint 2K25  
Institute: Walchand College of Engineering, Sangli  
Problem Statement Category: Open Innovation  



## Problem Statement

In colleges, club-related information is scattered across WhatsApp groups, posters, emails, and social media. Students often miss important updates, clubs struggle to coordinate members, and events clash due to poor planning. There is no single platform to manage events, assign responsibilities, and communicate efficiently. Faculty members are often unaware of overlapping academic and extracurricular activities, leading to confusion and scheduling conflicts.



## Our Solution

Club-Connect is a centralized college club coordination platform that goes beyond event management. It enables clubs to manage events, assign tasks to members, and coordinate activities efficiently from one system. Club admins can assign tasks and send automated email notifications to ensure accountability. Event and task clash detection prevents scheduling conflicts. Students receive real-time updates through Firebase, while Google Calendar integration keeps schedules synchronized. Cloudinary manages secure media uploads, and an AI Campus Bot assists users with navigation and queries. The platform improves transparency, communication, and engagement across campus life.



## Key Features

### Student Features
- View all upcoming and past club events
- Receive real-time updates and notifications
- Access detailed event information
- Use AI Campus Bot for guidance and queries

### Club and Admin Features
- Create, update, and manage events
- Assign tasks to club members
- Automated email notifications for tasks
- Event and task clash detection
- Role-based access for admins and club secretaries



## Tech Stack

Frontend: React, Tailwind CSS  
Backend & Database: Firebase Firestore  
Authentication: Firebase Authentication  
Media Storage: Cloudinary  
Version Control: Git and GitHub  



## Google Technologies Used

- Firebase Authentication
Used for secure login and role-based access control.

- Firebase Firestore
Used for real-time storage of events, tasks, and club data.

- Google Calendar API
Used to sync events and prevent scheduling conflicts.

- Google Maps



## Google AI Tools Integrated

- Google Gemini / Google AI Studio
Used during development for feature planning, UI improvements, and intelligent assistance.

## AI Features

- AI Campus Bot (powered by Groq)  
An AI-powered assistant that helps users navigate the platform and get instant responses to campus-related queries.



## Getting Started


Follow the steps below to set up the project locally.

## Prerequisites

- Node.js (v18 or higher)
- npm
- Git

Verify installation:
```bash
node -v
npm -v
git --version
```
## Installation
### 1.⁠ ⁠Clone the repository
```bash
git clone https://github.com/your-username/club-connect.git
cd club-connect
```
2.⁠ ⁠Install dependencies
```bash
npm install
```

---

Environment Setup

Create a .env file in the root directory and add the following:

Firebase Configuration
```bash

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```
Cloudinary Configuration
```bash

VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```
EmailJS Configuration
```bash

VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```
AI Integration
```bash

VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GROQ_API_KEY=your_groq_api_key
```
⚠️ Do not commit the .env file.
---

Run the Application
```bash

npm run dev
```
The application will run at:

http://localhost:5173


---

## Usage

- Students can explore events and announcements  
- Clubs can assign tasks and manage members  
- Email notifications are sent on task assignment  
- Event and task clashes are detected automatically  
- AI Campus Bot assists users in real time  

---
