---
title: "CI/CD Infrastructure & GitHub Actions Architecture"
description: "Authoritative specification for GitHub Actions CI workflow, local/CI parity principle, and isolated database service containers."
status: "active"
owner: "DevOps Architecture Team"
last_updated: "2026-07-22"
last_reviewed: "2026-07-22"
implemented_phase: "Phase 19.8"
current_since: "Phase 19.8"
related_documents:
  - "docs/operations/verification-and-testing.md"
  - "docs/standards/coding-guidelines.md"
superseded_by: null
review_frequency: "quarterly"
---

[Docs Wiki Portal](../README.md) > [Operations](README.md) > CI/CD Infrastructure

# CI/CD Infrastructure Architecture

This document defines the Continuous Integration (CI) automation setup for the **AI Project Manager** repository.

---

## 📋 Table of Contents
1. [Overview & Local/CI Parity Principle](#1-overview--localci-parity-principle)
2. [GitHub Actions Workflow Configuration](#2-github-actions-workflow-configuration)
3. [Workflow Architecture & Security Decisions](#3-workflow-architecture--security-decisions)
4. [Case Study: CI Environment Failure & Resolution](#4-case-study-ci-environment-failure--resolution)

---

## 1. Overview & Local/CI Parity Principle

The repository utilizes **GitHub Actions** for automated quality enforcement on every pull request and main branch push.

### Core Design Principle: Local/CI Parity
CI logic must **never** diverge from local developer verification commands. The CI workflow (`.github/workflows/ci.yml`) intentionally executes the exact same canonical quality gate that developers run locally:

```bash
npm run verify
```

This guarantees that if code passes `npm run verify` on a developer's machine, it will pass in CI without unexpected toolchain surprises.

---

## 2. GitHub Actions Workflow Configuration (`.github/workflows/ci.yml`)

```yaml
name: CI Quality Gate

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  verify:
    name: Canonical Verification Pipeline
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:8.0
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.runCommand({ ping: 1 })'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install root dependencies
        run: npm ci

      - name: Install client dependencies
        run: npm ci --prefix client

      - name: Install server dependencies
        run: npm ci --prefix server

      - name: Execute Canonical Verification Pipeline
        env:
          NODE_ENV: test
          PORT: 5000
          MONGODB_URI: mongodb://127.0.0.1:27017/ai-project-manager-test
          JWT_ACCESS_SECRET: ci-test-access-secret-key-32-chars-min
          JWT_REFRESH_SECRET: ci-test-refresh-secret-key-32-chars-min
          ANTHROPIC_API_KEY: smoke-key-do-not-use
          CLIENT_URL: http://localhost:5173
          VITE_API_URL: http://localhost:5000/api/v1
        run: npm run verify
```

---

## 3. Workflow Architecture & Security Decisions

### Service Containers & Isolated Database
- The workflow launches a dedicated `mongo:8.0` Docker service container directly on the runner.
- The service enforces a container health check (`mongosh ping`) before steps execute.
- Server tests connect to `mongodb://127.0.0.1:27017/ai-project-manager-test`, guaranteeing complete isolation from external or production databases.

### Safe Dummy Environment Variables
- Sensitive environment variables (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ANTHROPIC_API_KEY`) are populated with safe, fixed dummy values explicitly for testing.
- No production secrets or Anthropic API tokens are stored or exposed in GitHub Actions secrets.
- `ANTHROPIC_API_KEY=smoke-key-do-not-use` allows the application smoke test (`smoke.ts`) to validate prompt registration without initiating billable API requests.

### Least-Privilege Permissions & Concurrency
- `permissions: contents: read` restricts the workflow token from writing to the repository.
- `concurrency.cancel-in-progress: true` automatically cancels outdated CI runs when a developer pushes new commits to an open PR.

---

## 4. Case Study: CI Environment Failure & Resolution

### The Incident
During the initial deployment of the GitHub Actions workflow, the CI run failed during client verification while local developer runs succeeded.

### Root Cause Analysis
Local developer environments had `.env` files supplying `VITE_API_URL=http://localhost:5000/api/v1`. However, the initial CI workflow step omitted `VITE_API_URL` from the step environment block. As a result, client build steps fell back to undefined API configuration, causing a verification mismatch between local and CI runners.

### Fix Applied
`VITE_API_URL: http://localhost:5000/api/v1` was explicitly added to the `Execute Canonical Verification Pipeline` step environment in `.github/workflows/ci.yml`.

### Broader Engineering Lesson
A verification pipeline is only reproducible when both **commands** and **environment variables** are equivalent between local workstations and CI runners.
