"use server"

import { sql } from '@vercel/postgres';

export async function getSystemPrompt() {
  try {
    const { rows } = await sql`
      SELECT system_prompt 
      FROM chat_setting 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    return rows[0]?.system_prompt || '';
  } catch (error) {
    console.error('Failed to fetch system prompt:', error);
    throw new Error('Failed to fetch system prompt');
  }
}

export async function updateSystemPrompt(prompt: string) {
    try {
      const { rowCount } = await sql`
        UPDATE chat_setting
        SET system_prompt = ${prompt}, updated_at = NOW()
        WHERE id = 1
      `;
  
      if (rowCount === 0) {
        await sql`
          INSERT INTO chat_setting (id, system_prompt, updated_at, created_at)
          VALUES (1, ${prompt}, NOW(), NOW())
        `;
      }
  
      return { success: true };
    } catch (error) {
      console.error('Failed to update system prompt:', error);
      throw new Error('Failed to update system prompt');
    }
  }