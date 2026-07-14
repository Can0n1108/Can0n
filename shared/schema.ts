// Database table structure (Drizzle ORM)
import { pgTable, serial, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    username: text('username').unique().notNull(),
    email: text('email').unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const analysisHistory = pgTable('analysis_history', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id),
    patientName: text('patient_name'),
    age: text('age'),
    gender: text('gender'),
    inputText: text('input_text'),
    result: jsonb('result'),
    status: text('status').default('completed'), // completed, failed
    createdAt: timestamp('created_at').defaultNow(),
});