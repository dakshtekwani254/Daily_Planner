import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = Object.fromEntries(envFile.split('\n').map(l => {
  const i = l.indexOf('=');
  return [l.slice(0, i), l.slice(i + 1).replace(/"/g, '')];
}));

const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const email = `test-${Date.now()}@example.com`;
  const password = 'Password123!';
  
  console.log('Signing up user:', email);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (authError) {
    console.error('Auth error:', authError);
    return;
  }
  
  const user = authData.user;
  console.log('User created:', user.id);
  
  // 1. Test Task Insert
  console.log('\n--- Testing Tasks ---');
  const taskData = {
    title: 'Test task',
    category: 'Personal',
    priority: 'medium',
    status: 'todo',
    user_id: user.id,
    is_recurring: false,
    recurrence_rule: null
  };
  const { error: taskError } = await supabase.from('tasks').insert(taskData);
  if (taskError) console.error('Task Insert Error:', taskError);
  else console.log('Task inserted successfully!');

  // 2. Test Project Insert
  console.log('\n--- Testing Projects ---');
  const projectData = {
    name: 'Test Project',
    stage: 'Idea',
    progress: 0,
    resume_ready: false,
    user_id: user.id
  };
  const { error: projectError } = await supabase.from('projects').insert(projectData);
  if (projectError) console.error('Project Insert Error:', projectError);
  else console.log('Project inserted successfully!');

  // 3. Test Notes Insert
  console.log('\n--- Testing Notes ---');
  const noteData = {
    title: 'Untitled',
    user_id: user.id
  };
  const { error: noteError } = await supabase.from('notes').insert(noteData);
  if (noteError) console.error('Note Insert Error:', noteError);
  else console.log('Note inserted successfully!');

  // 4. Test LeetCode Insert
  console.log('\n--- Testing LeetCode ---');
  const leetData = {
    problem_name: 'Test',
    difficulty: 'Medium',
    topic: 'Arrays',
    solved_at: new Date().toISOString().split('T')[0],
    user_id: user.id
  };
  const { error: leetError } = await supabase.from('leetcode_entries').insert(leetData);
  if (leetError) console.error('LeetCode Insert Error:', leetError);
  else console.log('LeetCode inserted successfully!');

  // 5. Test Learning Insert
  console.log('\n--- Testing Learning ---');
  const learnData = {
    subject: 'DSA',
    module_name: 'Arrays',
    total_items: 10,
    completed_items: 0,
    progress: 0,
    user_id: user.id
  };
  const { error: learnError } = await supabase.from('learning_modules').insert(learnData);
  if (learnError) console.error('Learning Insert Error:', learnError);
  else console.log('Learning inserted successfully!');
  
  // 6. Test Deep Work Session
  console.log('\n--- Testing Focus Sessions ---');
  const sessionData = {
    label: 'Deep work',
    planned_minutes: 25,
    user_id: user.id
  };
  const { error: sessionError } = await supabase.from('focus_sessions').insert(sessionData);
  if (sessionError) console.error('Session Insert Error:', sessionError);
  else console.log('Session inserted successfully!');
}

run().catch(console.error);
