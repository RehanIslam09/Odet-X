---
title: "AI Capability Endpoints Reference"
description: "Authoritative specification for AI task generation, auto-labeling, and project status summary endpoints."
status: "active"
owner: "AI Architecture Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19"
current_since: "Phase 19"
related_documents:
  - "docs/api/rest-api-reference.md"
  - "docs/architecture/ai-subsystem.md"
  - "docs/ai/prompt-engineering.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](../README.md) > [API](README.md) > AI Endpoints Reference

# AI Capability Endpoints Reference

This document details the three domain-scoped AI capability endpoints implemented in Phase 19.

---

## 📋 Table of Contents
1. [`POST /api/v1/projects/:id/generate-tasks`](#1-post-apiv1projectsidgenerate-tasks)
2. [`POST /api/v1/tasks/:id/generate-labels`](#2-post-apiv1tasksidgenerate-labels)
3. [`POST /api/v1/projects/:id/generate-summary`](#3-post-apiv1projectsidgenerate-summary)

---

## 1. `POST /api/v1/projects/:id/generate-tasks`

Generates structured tasks from a project description.

**Headers:** `Authorization: Bearer <token>`  
**Body:**
```json
{
  "description": "Optional custom prompt context for task breakdown"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Tasks generated successfully.",
  "data": {
    "tasks": [
      {
        "id": "60d5ec49f1b2c820b8f4111a",
        "title": "Design Database Schema",
        "description": "Create MongoDB collection models",
        "status": "todo",
        "priority": "high",
        "estimatedTime": "4 hours"
      }
    ]
  }
}
```

---

## 2. `POST /api/v1/tasks/:id/generate-labels`

Generates context-aware classification labels for an existing task.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Labels generated successfully.",
  "data": {
    "task": {
      "id": "60d5ec49f1b2c820b8f4111a",
      "title": "Build Auth Form",
      "labels": ["auth", "frontend", "ui", "react"]
    }
  }
}
```

**Rules:** Labels are trimmed, deduplicated, lowercased, and appended to existing task labels up to a maximum cap of 10 labels per task.

---

## 3. `POST /api/v1/projects/:id/generate-summary`

Generates an intelligent project status summary based on active tasks.

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Project summary generated successfully.",
  "data": {
    "project": {
      "id": "60d5ec49f1b2c820b8f4111a",
      "name": "E-Commerce App",
      "aiSummary": {
        "summary": "Project progress is steady with 60% of core tasks completed.",
        "highlights": [
          "Authentication system completed",
          "Database models created"
        ],
        "risks": [
          "Payment gateway integration pending"
        ],
        "generatedAt": "2026-07-21T14:30:00.000Z"
      }
    }
  }
}
```
