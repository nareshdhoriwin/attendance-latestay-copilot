**WinBuild 1.0 – Hackathon Implementation Document** 

AI Copilot for Attendance & Late-Stay Tracking 
Shape 

1. **Executive Summary** 

Use Case: AI Copilot for Automated Attendance & Late-Stay Monitoring 

Problem: 
Employee attendance and late-night work tracking are currently manual, fragmented, and paper based. Tracking women employees staying beyond 8:00 PM for safety and compliance requires additional manual effort and lacks real-time visibility. 

Solution: 
An AI Copilot that automatically tracks employee attendance using face recognition data, monitors late stays (especially women employees after 8:00 PM), generates insights, and produces compliance-ready reports, Employee well-being recommendations, apply for shift allowance (Based on project eligibility), work balance analytics and WFO mandate tracking. 

Target Users: 
Employees, HR teams, Admin teams, Project/Delivery leads, Security operations. 

Value: 

Enhances employee safety and well-being 

Provides real-time workforce insights 

Eliminates manual attendance registers, Applying for allowances 

Improves compliance and audit readiness 

Agentic Aspect: 
The Copilot autonomously detects attendance events, identifies late stays, analyzes patterns, generates recommendations, and produces compliance reports without manual intervention. 

Shape 

2. **Business Problem & Objectives** 

Business Problem 

Manual attendance tracking is error-prone and inefficient 

Late-night work tracking lacks centralized visibility 

Compliance reporting requires manual consolidation 

Project teams lack insights into workload balance and late-night dependency 

Objectives 

Automate attendance and late-stay tracking 

Provide real-time workforce visibility 

Improve compliance with safety and WFO policies 

Enable proactive well-being and workload recommendations 

Success Metrics 

% attendance events auto-captured 

Reduction in manual attendance effort 

% late-stay events auto-detected 

Adoption of work balance and well-being reports 

In Scope 

Face-recognition-based attendance tracking 

Late-stay detection after 8:00 PM 

Work balance, well-being, and WFO compliance reporting 

Out of Scope 

Payroll processing 

Transportation or cab booking 

Leave management 

Shape 

3. **Functional Requirements**

FR-01: System automatically records employee check-in & Check out using face recognition & calculates work hours 

FR-02: Users can request attendance summaries on demand 

FR-03: System flags late arrivals based on shift rules 

FR-04: System generates attendance compliance reports 

FR-05: System detects women employees present after 8:00 PM 

FR-06: System logs safe exit after late stay 

FR-07: System supports shift allowance requests for project-based shifts 

FR-08: System generates project-wise work balance reports 

FR-09: System provides employee well-being recommendations 

FR-10: System recommends project guidelines for frequent late-night work 

FR-11: System provides daily people count in office 

FR-12: System tracks Work From Office mandate compliance 

Shape 

4. **Non-Functional Requirements** 

Performance: Attendance detection response < 3 seconds 

Scalability: Supports 500+ concurrent users 

Security: Enterprise authentication and role-based access 

Reliability: Retry mechanisms for face recognition failures 

Availability: 99.5% uptime during business hours 

Observability: Logs for attendance events, late stays, and reports 

Shape 

5. **Solution Architecture & Design 
**
High-Level Architecture 

Frontend: Web or mobile interface for dashboards and Copilot interaction 

Backend: API layer handling attendance events and report generation 

AI Copilot: Orchestrates logic for detection, analysis, and recommendations 

Face Recognition Module: Captures entry/exit events 

Data Store: Stores attendance, late-stay, and compliance data 

Design Highlights 

Event-driven attendance capture 

Rule-based + AI-driven analysis 

Natural language interaction via Copilot 

Shape 

6. **Data & Integration Design** 

Data Flow 

Input: Facial image capture, time-stamp, project mapping 

Processing: Attendance validation, late-stay detection, analytics 

Output: Attendance logs, reports, recommendations 

Integrations 

Camera / Face recognition system 

Notification services (email/chat) 

Enterprise identity provider 

Shape 

7. **Implementation Approach** 

Implement face-recognition-based entry/exit capture 

Build Copilot logic for attendance and late-stay detection 

Create reporting modules for compliance and analytics 

Add well-being and project guideline recommendation logic 

Enable natural language interaction for queries and insights 

Shape 

8. **Testing Strategy **

Unit Testing: Attendance event detection logic 

Integration Testing: Face recognition to report generation flow 

End-to-End Testing: Entry → Late stay → Exit → Compliance report 

Limitations: Mocked face recognition data during hackathon 

Shape 

9. **Security, Governance & Responsible AI** 

Authentication: Enterprise SSO 

Privacy: Facial data processed securely, minimal retention 

Governance: Access controls for sensitive reports 

Responsible AI: No profiling beyond attendance and safety needs 

Audit: Logged attendance and late-stay events 

Shape 

10. **Deployment & Runtime Setup **

Single cloud-hosted application 

Environment-based configuration 

Secure storage of AI and system credentials 

Shape 

11. **Demo Walkthrough** 

Employee enters office → attendance auto-recorded 

Copilot displays attendance summary 

System detects women employees after 8:00 PM 

Safe exit logged automatically 

Work balance and WFO compliance reports generated 

Shape 

12. **Outcomes, Learnings & Next Steps** 

Outcomes 

Fully automated attendance and late-stay tracking demo 

Compliance-ready reporting achieved 

Learnings 

Event-driven design simplifies agent orchestration 

Clear policy rules improve recommendation accuracy 

Next Steps 

Integrate payroll systems 

Add predictive workload forecasting 

Extend safety workflows 

Shape 

13. **Appendix** 

Sample Copilot prompts 

Attendance event schema 

Report mockups 

 
