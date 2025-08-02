# Gatepass Management System

A full-stack Gatepass Management System designed for educational institutions using the **MERN stack** (MongoDB, Express.js, React, Node.js) and **Vite** for fast frontend apps. It features multi-role authentication, CSV-based student import, SMS notifications to parents via Twilio, and a step-wise approval workflow.

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
gatepass-management/
├── backend/ # Express API, MongoDB, Twilio, JWT
├── user-panel/ # Vite app - Students
├── incharge-panel/ # Vite app - Incharges
├── hod-panel/ # Vite app - HODs
├── security-panel/ # Vite app - Security
├── LICENSE
├── README.md
├── paper.md # Research summary for Zenodo
├── .gitignore


---

## 🚀 Getting Started

### 1. Clone the Repo

```bash
git clone https://github.com/Vamshirathod14/gatepass-manager.git
cd gatepass-management
2. Setup Backend
cd backend
npm install
npm run dev
Create a .env file in backend/ with:
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
TWILIO_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE=+91xxxxxxxxxx
Check backend/.env.example for reference.
3. Setup Each Frontend Panel
Repeat for each folder (user-panel, incharge-panel, hod-panel, security-panel):

cd user-panel
npm install
npm run dev
 How It Works

1.Student submits a gatepass request

2.Incharge approves or rejects

3.HOD gives final approval if passed

4.Security marks student as "Out"

5.SMS sent to parent using Twilio

6.Each student gets max 3 passes per month (auto resets)

Security Notes
Sensitive data is stored in .env files (ignored by Git)

Twilio SMS keeps parents notified of student exit

Admin controls all student uploads via CSV

License
This project is licensed under the MIT License.
See the LICENSE file for details.

Author
 **Ramavath Vamshi** – Project Lead & Full-Stack Developer  
📧 [vamshinaikramavath@gmail.com](mailto:vamshinaikramavath@gmail.com)  
🔗 [ORCID iD](https://orcid.org/0009-0004-8328-3655)  
🔗 [LinkedIn](https://www.linkedin.com/in/vamshiramavat/)


---

### ✅ Now do this:

1. Replace `README.md` content in your GitHub repo with this.
2. Push it to GitHub:
```bash
git add README.md
git commit -m "Updated final README with solo authorship and project overview"
git push


