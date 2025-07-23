---
title: 'Gatepass Management System: A MERN-based Multi-Panel Solution for Campus Access Control'
tags:
  - MERN
  - Vite
  - MongoDB
  - React
  - Node.js
  - Campus Automation
  - SMS Alerts
authors:
  - name: Ramavath Vamshi
    orcid: 0009-0004-8328-3655
    affiliation: 1
  - name: Gaddi Deepthi
    orcid: 0009-0003-8916-5927
    affiliation: 2
  - name: Jadala Sreeja
    orcid: 0009-0003-8803-0713
    affiliation: 3
  - name: Sunkoju Maheshwara Chary
    orcid: 0009-0001-7774-6076
    affiliation: 4
affiliations:
  - name: Department of CSE, Scient Institute of technology, India
    index: 1
  - name: Department of AIML, Sphoorthy Engineering College , India
    index: 2
  - name: Department of AIML, Jaymukhi Institute of Technological Sciences, India
    index: 3
  - name: Department of AIML, Scient Institute of Technology, India
    index: 4
date: 2025-07-22
license: MIT
repository: https://github.com/Vamshirathod14/gatepass-manager

---

## Summary

The **Gatepass Management System** is a full-stack web application developed using the **MERN stack (MongoDB, Express.js, React, Node.js)** and **Vite**. It is designed to automate and streamline the gatepass approval process in academic institutions by enabling multi-level role-based panels: Student, Incharge, HOD, Security, and Admin.

Students submit gatepass requests that pass through sequential approvals by class incharges and the Head of Department (HOD). Upon final approval, the security panel verifies the student and marks them as exited. An SMS is then automatically sent to the parent using the **Twilio API**. The system also features monthly request limits and CSV-based student data uploads by admins.

This project enhances campus security, ensures parental transparency, and reduces paperwork.

## Statement of Need

Many academic institutions still use manual paper-based gatepass systems, which are inefficient, insecure, and lack audit trails. Our software solves this by offering:

- Secure login-based interfaces for each stakeholder
- Role-specific dashboards
- Automated SMS alerts to parents
- A scalable backend with MongoDB Atlas
- CSV upload for bulk student data

It is ideal for engineering colleges, schools, and private institutions seeking a transparent and digital gatepass flow.

## Implementation

The application is divided into five Vite-based frontend panels and a single Express.js backend:

- **Backend**: RESTful API using Express, MongoDB, JWT, and Twilio integration
- **Frontend Panels**: Separate Vite apps for:
  - `user-panel` (students)
  - `incharge-panel` (faculty)
  - `hod-panel` (HODs)
  - `security-panel` (guards)
  - `admin-panel` (CSV uploader)

Each request follows a linear workflow with database updates and SMS notifications handled at each stage.

## Acknowledgements

This project was developed as part of a collaborative academic mini-project. The authors acknowledge the use of open-source tools and services including Vite, MongoDB Atlas, and Twilio.

## References

- Express.js – https://expressjs.com/
- MongoDB Atlas – https://www.mongodb.com/atlas
- React + Vite – https://vitejs.dev/
- Twilio – https://www.twilio.com/
- JOSS – https://joss.theoj.org
