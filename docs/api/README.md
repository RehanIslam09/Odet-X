---
title: "REST API Reference Index"
description: "Directory and index of authoritative API specifications, envelope standards, and error codes."
status: "active"
owner: "API Architecture Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 4"
related_documents:
  - "docs/README.md"
  - "docs/api/rest-api-reference.md"
  - "docs/api/ai-endpoints.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](../README.md) > API Index

# Authoritative REST API Specifications

This directory contains complete, authoritative API contracts for **AI Project Manager**.

---

## 📚 Section Directory

| Document | Primary Focus | Key Endpoints Covered |
|---|---|---|
| [`rest-api-reference.md`](rest-api-reference.md) | Standard REST API Specification | Health, Auth, Users, Projects, Tasks, Dashboard, Activity, Notifications |
| [`ai-endpoints.md`](ai-endpoints.md) | AI Capability REST Routes | Project Task Generation, Task Auto-Labeling, Project Summary Generation |

---

## 📬 Global Response Envelope Standard

All REST API endpoints return a uniform JSON envelope:

### Success Response Envelope
```json
{
  "success": true,
  "message": "Human-readable operational message.",
  "data": { ... }
}
```

### Error Response Envelope
```json
{
  "success": false,
  "message": "Human-readable error description."
}
```

### Validation Error Envelope (400 Bad Request)
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {
    "fieldName": "First validation failure message for this field."
  }
}
```
