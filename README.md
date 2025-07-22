# Gatepass management System

A full-stack Gatepass Management System designed for educational institutions using **MERN stack** (MongoDB, Express.js, React, Node.js) and **Vite** for fast frontend apps. It features multi-role authentication, CSV-based student import, SMS notifications to parents via Twilio, and a step-wise approval workflow.

---

## 🔧 Tech Stack

- **Frontend**: React + Vite (`user`, `incharge`, `hod`, `security` panels)
- **Backend**: Node.js + Express
- **Database**: MongoDB Atlas
- **Authentication**: JWT
- **SMS API**: Twilio
- **File Upload**: CSV format

---

## 📌 System Overview

### 👨‍🎓 Student Panel
- Enter name, hall ticket, class, and reason
- Submit a gatepass request
- View real-time status updates

### 👨‍🏫 Incharge Panel
- Login class-wise
- Approve or reject student requests
- Add rejection reason

### 👩‍🏫 HOD Panel
- View incharge-approved requests
- Give final approval or rejection

### 🛡 Security Panel
- Enter hall ticket to verify student
- Mark student as "Out"
- Send SMS to parent via Twilio

### 🗂 Admin Panel
- Upload students using CSV file
- Fields: Name, Hall Ticket, Class, Year, Parent Phone Number

---

## 📁 Project Structure
Gatepass_management/
├── backend/ # Express API, MongoDB, Twilio, JWT
├── user-panel/ # Vite app - Students
├── incharge-panel/ # Vite app - Incharges
├── hod-panel/ # Vite app - HODs
├── security-panel/ # Vite app - Security
├── LICENSE
├── README.md
├── paper.md # JOSS paper submission
├── .gitignore
## 🚀 Getting Started

### 1. Clone the Repo

```bash
git clone https://github.com/Vamshirathod14/gatepass-manager.git
cd gatepass-management

###set up backend
cd backend
npm install
npm run dev

#create a .env file in backend folder
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
TWILIO_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE=+91xxxxxxxxxx

#check backend/.env.example for reference 

#set up frontend
Repeat this for each folder: user-panel, incharge-panel, hod-panel, security-panel
cd user-panel
npm install
npm run dev

#How It Works
Student submits a gatepass request

Incharge approves/rejects

If approved, it moves to HOD

HOD gives final approval

Security marks exit and triggers SMS to parent

Monthly limit: 3 passes per student (resets automatically)

#security Notes
Real .env is ignored via .gitignore

Never commit secrets — use .env.example instead

Twilio alerts ensure parent awareness of student exit

##LICENSE 

This project is licensed under the MIT License.
See LICENSE for full terms.

Author
**Ramavath Vamshi** – Project Lead, Full-Stack Developer 
**Gaddi Deepthi** - Contributor
**Jadala Sreeja** - Contibutor
**Sunkoju Maheshwara** Chary - Contibutor
For submission to the Journal of Open Source Software (JOSS)

##Contact
📧 vamshinaikramavath@gmail.com

---

### ✅ Next Steps:

1. Copy the full content above
2. Paste it into your `README.md` file (create if not there)
3. Save and push:

```bash
git add README.md
git commit -m "Added full README.md with project overview"
git push
