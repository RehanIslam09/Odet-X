import { GeneratePlanResponse } from '../../../schemas/project-plan.schema.js';
import { EvaluationFixture } from '../../types/evaluation.types.js';
import { ProjectPlanGroundTruth } from '../schemas/fixture.schema.js';

/**
 * Canonical Planning Golden Scenario: SaaS Authentication & User Management.
 * ID: fix_plan_saas_auth_v1
 */
export const saasAuthPlanningFixture: EvaluationFixture<
  { description: string },
  ProjectPlanGroundTruth,
  GeneratePlanResponse
> = {
  fixtureId: 'fix_plan_saas_auth_v1',
  name: 'SaaS Authentication & User Management Plan',
  description: 'Evaluates AI project plan generation for a standard SaaS authentication system with JWT sessions, email verification, password reset, and user profile management in Express and PostgreSQL.',
  targetCapability: 'project-plan',
  version: '1.0.0',

  input: {
    description: 'Build a SaaS authentication system with JWT sessions, email verification, password reset endpoints, and user profile management in Express and PostgreSQL.',
  },

  groundTruth: {
    expectedTasks: [
      {
        id: 'concept_user_profile',
        concept: 'User Profile Management',
        keywords: ['user profile', 'profile', 'user model', 'database model'],
        required: true,
      },
      {
        id: 'concept_jwt_auth',
        concept: 'JWT Token Scheme & Authentication Middleware',
        keywords: ['jwt', 'token', 'auth middleware', 'session'],
        required: true,
      },
      {
        id: 'concept_email_verify',
        concept: 'Email Verification Service',
        keywords: ['email', 'verification', 'verify'],
        required: true,
      },
      {
        id: 'concept_password_reset',
        concept: 'Password Reset & Recovery Endpoints',
        keywords: ['password reset', 'recovery', 'reset token'],
        required: true,
      },
    ],

    expectedMilestones: [
      {
        id: 'concept_ms_core_auth',
        concept: 'Core Authentication API',
        keywords: ['auth', 'authentication', 'api'],
        required: true,
      },
      {
        id: 'concept_ms_account_mgmt',
        concept: 'Account & Profile Management',
        keywords: ['account', 'profile'],
        required: true,
      },
    ],

    groundedContextFacts: [
      'Express',
      'PostgreSQL',
      'JWT',
      'email verification',
      'password reset',
      'user profile',
    ],

    forbiddenClaims: [
      'OAuth 1.0',
      'SOAP',
      'MongoDB',
      'Redis Cluster',
      'GraphQL Subscriptions',
    ],

    expectedDependencyEdges: [
      {
        prerequisiteConcept: 'User Profile Management',
        dependentConcept: 'JWT Token Scheme & Authentication Middleware',
        reason: 'User database model must exist before JWT authentication middleware can issue and verify user session tokens.',
      },
    ],
  },

  candidateOutputs: {
    knownGood: {
      milestones: [
        {
          ref: 'ms_1',
          title: 'Core Authentication API',
          description: 'Backend auth endpoints and JWT infrastructure',
          targetDate: '2026-08-15',
          position: 1,
        },
        {
          ref: 'ms_2',
          title: 'Account & Profile Management',
          description: 'User profile updates and settings',
          targetDate: '2026-08-30',
          position: 2,
        },
      ],
      tasks: [
        {
          ref: 'task_1',
          title: 'Design User Profile & Database Model',
          description: 'Create PostgreSQL schema and Mongoose user profile model',
          priority: 'high',
          estimatedTime: '1d',
          position: 1,
          dependencies: [],
          milestoneRef: 'ms_1',
        },
        {
          ref: 'task_2',
          title: 'Implement JWT Token Scheme & Auth Middleware',
          description: 'Set up JWT access and refresh token authentication middleware in Express',
          priority: 'high',
          estimatedTime: '2d',
          position: 2,
          dependencies: ['task_1'],
          milestoneRef: 'ms_1',
        },
        {
          ref: 'task_3',
          title: 'Create Email Verification Service',
          description: 'Send email verification tokens on registration',
          priority: 'medium',
          estimatedTime: '1d',
          position: 3,
          dependencies: ['task_1'],
          milestoneRef: 'ms_1',
        },
        {
          ref: 'task_4',
          title: 'Build Password Reset & Recovery Endpoints',
          description: 'Implement password reset token generation and endpoint verification',
          priority: 'medium',
          estimatedTime: '1d',
          position: 4,
          dependencies: ['task_1'],
          milestoneRef: 'ms_1',
        },
      ],
    },

    knownRegression: {
      milestones: [
        {
          ref: 'ms_1',
          title: 'General Setup',
          description: 'Basic setup',
          targetDate: null,
          position: 1,
        },
      ],
      tasks: [
        {
          ref: 'task_1',
          title: 'Configure MongoDB Database',
          description: 'Set up MongoDB document store for user profiles',
          priority: 'none',
          estimatedTime: '1d',
          position: 1,
          dependencies: [],
          milestoneRef: 'ms_1',
        },
        {
          ref: 'task_2',
          title: 'Implement OAuth 1.0 Integration',
          description: 'Connect legacy OAuth 1.0 protocol',
          priority: 'low',
          estimatedTime: '3d',
          position: 2,
          dependencies: [],
          milestoneRef: 'ms_1',
        },
      ],
    },
  },

  metadata: {
    author: 'Odet-X Core Engineering',
    createdAt: '2026-07-24',
    tags: ['planning', 'saas', 'auth', 'regression'],
  },
};
