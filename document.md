# University Student Clearance System - Logical Modules & Data Flow

This document describes the logical modules of the system, their internal processes, inputs, and outputs. This structure is designed to assist in creating Deployment Diagrams (DD) and Data Flow Diagrams (DFDs) without tying the design to specific technologies.

## 1. User Identity & Access Management Module
This module acts as the gatekeeper for the system, ensuring that only verified users can access the platform and that they are restricted to their authorized roles.

*   **Sub-Processes:**
    *   **User Registration:** Captures basic user information and assigns default roles.
    *   **Authentication Validation:** Verifies credentials and establishes secure user sessions.
    *   **Role Provisioning:** Automatically determines and assigns access levels (e.g., Student, Department Staff, System Administrator) based on user type.
*   **Data Inputs:** User credentials (Email, Password), Registration Details.
*   **Data Outputs:** Session authorizations, Role-based access tokens, Profile initialization records.

## 2. Student Operations Module
This module provides the primary interface for students to interact with the clearance workflow, submit their data, and track their progress.

*   **Sub-Processes:**
    *   **Clearance Initiation:** Allows students to submit their initial clearance requests to the university.
    *   **Status Tracking:** Aggregates and displays the clearance status (Pending, Cleared, Issue) from all required departments in real-time.
    *   **Alumni Data Collection:** Captures post-graduation details (e.g., job placement, higher education plans).
*   **Data Inputs:** Clearance form submissions, Future/Alumni data entry, Issue resolution responses.
*   **Data Outputs:** Clearance requests routed to departments, Profile data updates sent to the central repository.

## 3. Department Clearance Processing Module
This module is utilized by various university departments (Academic Departments, Library, Transport, Finance, Hostel) to process the requests sent by students.

*   **Sub-Processes:**
    *   **Queue Management:** Displays a list of pending student clearance requests specific to the department.
    *   **Request Adjudication:** Staff review requests and update the status to "Cleared" or flag an "Issue".
    *   **Form Distribution:** Departments can define and distribute specific prerequisite forms that students must complete.
    *   **Issue Logging:** Staff can attach mandatory remarks or conditions that a student must fulfill before clearance is granted.
*   **Data Inputs:** Incoming clearance requests from students, Completed departmental forms.
*   **Data Outputs:** Clearance status updates (Approval/Rejection), Issue remarks, Department-specific form templates.

## 4. Central Administration & Audit Module
The centralized control hub for principal administrators to oversee the entire clearance operation, manage users, and issue the final university clearance.

*   **Sub-Processes:**
    *   **Global Monitoring:** Aggregates data from all departments to show system-wide bottlenecks and overall progress.
    *   **User & Data Management:** Allows admins to manually override statuses, correct student records, or enroll new users outside the standard flow.
    *   **Final Dispatch:** Verifies that a student has obtained all necessary departmental approvals and issues the final, official university clearance certificate.
    *   **Audit Logging:** Silently records all administrative and departmental actions for accountability and reporting.
*   **Data Inputs:** Consolidated departmental clearance records, Manual override commands, Audit events from other modules.
*   **Data Outputs:** Final Clearance Certificates, System-wide reports, Immutable audit trails.

## 5. Notification & Alert Engine Module
This module is responsible for asynchronously informing users of critical events, status changes, and required actions.

*   **Sub-Processes:**
    *   **Event Listening:** Monitors the central data repository for specific triggers (e.g., a status changing from "Pending" to "Issue").
    *   **Message Formatting:** Generates the appropriate message content based on the event context.
    *   **Multi-Channel Dispatch:** Routes the formatted message through the correct communication channel (In-App notification, Email, SMS).
*   **Data Inputs:** Status change events, Action triggers from Departments or Admins.
*   **Data Outputs:** Delivered alerts and notifications to the end user.

## 6. Central Data Repository Module
The core data storage layer that maintains the state of the entire system and enforces data access rules.

*   **Entities / Data Stores:**
    *   **Profiles Store:** Holds personal details, roles, and account statuses.
    *   **Clearance Ledger:** Tracks the exact state of every student across every required department.
    *   **Future Data Store:** Houses the post-graduation alumni surveys.
    *   **Audit Store:** Contains the chronological log of all system activities.
*   **Data Inputs:** Create, Read, Update, and Delete (CRUD) requests from all active modules.
*   **Data Outputs:** Filtered query results distributed back to the requesting modules based on access rights.
