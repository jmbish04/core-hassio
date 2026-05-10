/**
 * @fileoverview Database schema definitions using drizzle-orm.
 *
 * This file defines the database schema using drizzle-orm for the complete application.
 * It includes tables for authentication, dashboard metrics, AI threads, and system health.
 */

import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/**
 * Users table for authentication
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Sessions table for managing user sessions
 */
export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Dashboard metrics table
 */
export const dashboardMetrics = sqliteTable("dashboard_metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  metricName: text("metric_name").notNull(),
  metricValue: real("metric_value").notNull(),
  metricType: text("metric_type").notNull(), // 'count', 'percentage', 'currency', 'time'
  category: text("category").notNull(), // 'users', 'revenue', 'performance', 'system'
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * AI Thread table for assistant conversations
 */
export const threads = sqliteTable("threads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Messages table for thread conversations
 */
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  threadId: integer("thread_id")
    .notNull()
    .references(() => threads.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON string for attachments, tool calls, etc.
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * System health checks table
 */
export const healthChecks = sqliteTable("health_checks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serviceName: text("service_name").notNull(),
  status: text("status").notNull(), // 'healthy', 'degraded', 'down'
  responseTime: integer("response_time"), // in milliseconds
  errorMessage: text("error_message"),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Notifications table for system alerts
 */
export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'info', 'warning', 'error', 'success'
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * PlateJS documents table
 */
export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(), // JSON string of Slate nodes
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Smart Home Control Panel tables
 */
export const stateChanges = sqliteTable("state_changes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityId: text("entity_id").notNull(),
  oldState: text("old_state"),
  newState: text("new_state"),
  attributes: text("attributes", { mode: "json" }), // JSON string
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const actions = sqliteTable("actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // 'service_call', 'scene_activation', etc.
  domain: text("domain"),
  service: text("service"),
  entityId: text("entity_id"),
  serviceData: text("service_data", { mode: "json" }), // JSON string
  userAgent: text("user_agent"),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const metrics = sqliteTable("metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(), // 'energy_kwh', 'temperature', 'humidity'
  entityId: text("entity_id"),
  value: real("value"),
  unit: text("unit"),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const insights = sqliteTable("insights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category"), // 'energy_anomaly', 'pattern_detected', 'suggestion'
  title: text("title"),
  description: text("description"),
  data: text("data", { mode: "json" }), // JSON string
  significanceScore: real("significance_score"), // 0-100
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const behaviorPatterns = sqliteTable("behavior_patterns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patternName: text("pattern_name"),
  description: text("description"),
  conditions: text("conditions", { mode: "json" }), // JSON string
  frequency: integer("frequency"),
  confidence: real("confidence"), // 0-100%
  lastObserved: integer("last_observed", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const suggestions = sqliteTable("suggestions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title"),
  description: text("description"),
  automationConfig: text("automation_config", { mode: "json" }), // YAML config as JSON string
  reason: text("reason"),
  estimatedBenefit: text("estimated_benefit"),
  status: text("status").default("new"), // 'new', 'viewed', 'accepted', 'dismissed'
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

export const cameraEvents = sqliteTable("camera_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cameraId: text("camera_id"),
  snapshotUrl: text("snapshot_url"),
  analysis: text("analysis", { mode: "json" }), // JSON string
  detectedObjects: text("detected_objects", { mode: "json" }), // JSON array
  alertLevel: text("alert_level"), // 'none', 'low', 'medium', 'high'
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
});

export const chatHistory = sqliteTable("chat_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userMessage: text("user_message"),
  assistantResponse: text("assistant_response"),
  intent: text("intent"),
  entitiesMentioned: text("entities_mentioned", { mode: "json" }), // JSON array
  actionsTaken: text("actions_taken", { mode: "json" }), // JSON array
  userSatisfaction: text("user_satisfaction"), // 'good', 'bad', 'neutral'
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
