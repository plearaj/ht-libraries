# Feature Specification: ht-software Showcase Application

**Feature Branch**: `001-software-showcase`
**Created**: 2026-02-18
**Status**: Draft
**Input**: Kitchen sink application that shows off the functionality of the other components or services

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Live Component Demos (Priority: P1)

A developer new to ht-libraries visits ht-software to evaluate whether the libraries suit
their project. They can navigate to individual demo pages for each library and interact
with live, working instances of every major component and service.

**Why this priority**: This is the core purpose of the showcase — a developer must be
able to see a component working before deciding to adopt it. Without live demos, the
app has no value.

**Independent Test**: Navigate to the table demo page; a fully rendered, interactive
Angular Material table appears with sample data. No other demo page needs to exist for
this to deliver value independently.

**Acceptance Scenarios**:

1. **Given** a developer opens the app, **When** they navigate to the ht-quick-angular-table
   demo, **Then** they see a working table populated with sample data, with sorting,
   filtering, and pagination all interactive.
2. **Given** a developer opens the app, **When** they navigate to the ht-quick-ngxfire demo,
   **Then** they see live Firestore read/write operations executing against a demo Firebase
   project with results displayed on screen.
3. **Given** a developer opens the app, **When** they navigate to the ht-camera-upload demo,
   **Then** they can trigger the camera/file picker and see an image preview after selection.

---

### User Story 2 - View Configuration Examples (Priority: P2)

A developer wants to understand how to configure a library for their own app. The showcase
displays the configuration or setup code alongside the live demo so they can copy and
adapt it directly.

**Why this priority**: Seeing working code paired with its output is the second most
useful thing a showcase can do. A live demo without the setup code leaves developers
guessing at integration.

**Independent Test**: The table demo page shows the configuration object used to produce
the displayed table, independently readable without any other demo page existing.

**Acceptance Scenarios**:

1. **Given** a developer views any demo page, **When** they look for setup guidance,
   **Then** they see the exact configuration used to produce the live demo on the same page.
2. **Given** a developer copies a configuration snippet from the showcase, **When** they
   use it in their own Angular app with the corresponding library installed, **Then** it
   produces the same output without modification.

---

### User Story 3 - Navigate Between All Library Demos (Priority: P3)

A developer explores all available libraries from a central navigation. Each library has
its own dedicated section and the navigation clearly indicates which demo corresponds to
which published package.

**Why this priority**: Discoverability drives adoption. A developer should not have to
guess what demos exist or hunt through the app to find them.

**Independent Test**: The home or nav area lists all three libraries by name with links
to their demo pages; navigating each link loads the correct demo without errors.

**Acceptance Scenarios**:

1. **Given** a developer is on any page, **When** they use the navigation, **Then** they
   can reach every library demo in at most two interactions.
2. **Given** a developer lands on the home page, **Then** all three libraries
   (ht-quick-ngxfire, ht-quick-angular-table, ht-camera-upload) are listed with a brief
   description of each and a link to their demo.

---

### Edge Cases

- What happens when the demo Firebase project is unavailable? The ngxfire demo must
  display a clear error state rather than a blank or broken screen.
- What happens when camera permissions are denied in the browser? The camera-upload demo
  must show a user-friendly fallback (file picker only) with an explanatory message.
- What happens when a library demo does not yet exist? The nav entry must be visible and
  marked "coming soon" rather than hidden or broken.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST provide a dedicated demo page for each published ht-library:
  ht-quick-ngxfire, ht-quick-angular-table, and ht-camera-upload.
- **FR-002**: Each demo page MUST render a live, interactive instance of the library's
  primary component or service using realistic sample data.
- **FR-003**: Each demo page MUST display the configuration or setup code used to produce
  the live demo on the same page, adjacent to the demo itself.
- **FR-004**: The app MUST provide navigation that allows a user to reach any demo page
  from any other page in at most two interactions.
- **FR-005**: The ht-quick-ngxfire demo MUST perform at least one live Firestore read
  operation and display the result on screen.
- **FR-006**: The ht-camera-upload demo MUST allow the user to select an image from a
  file or the camera and display a preview after selection.
- **FR-007**: The ht-quick-angular-table demo MUST display a table with sorting,
  filtering, and pagination all enabled and interactive.
- **FR-008**: Demo pages MUST handle error states (Firebase unavailable, camera
  permission denied) by displaying a visible, descriptive message within 2 seconds of
  the failure.
- **FR-009**: The home page MUST list all three libraries by name with a brief
  description and a link to each demo.

### Key Entities

- **Library Demo**: A page pairing a live interactive component instance with its
  configuration snippet; belongs to exactly one library package.
- **Navigation Entry**: A labelled link to a library demo, carrying the library name,
  short description, and availability status (active or coming soon).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All three library demos load and become interactive within 3 seconds on a
  standard broadband connection.
- **SC-002**: A developer unfamiliar with the libraries can locate and interact with any
  demo in under 60 seconds from landing on the home page.
- **SC-003**: Every configuration snippet on a demo page produces the same output as the
  live demo — zero discrepancies between shown configuration and rendered result.
- **SC-004**: All error states display a readable message within 2 seconds of the failure
  occurring — no blank screens or unhandled exceptions visible to the user.
- **SC-005**: The app builds without errors after rebuilding any linked library, confirming
  that library changes are reflected without manual intervention.

## Assumptions

- The app connects to a real Firebase project for the ngxfire demo; credentials are
  supplied via environment configuration and are not committed to source control.
- ht-software is not published to npm; it exists only as a local Angular workspace
  application and is never deployed as a library.
- The primary audience is developers evaluating the libraries on desktop browsers;
  mobile layout is desirable but not a hard requirement for this spec.
- Sample data for demos is hardcoded or locally seeded — no external data API is needed.
