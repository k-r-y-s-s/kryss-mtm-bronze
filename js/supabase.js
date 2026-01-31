// js/supabase.js
const SUPABASE_URL = 'https://hnjlrjtiomdqcqznkuxh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuamxyanRpb21kcWNxem5rdXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDQ5MTUsImV4cCI6MjA4NTQyMDkxNX0.iW9E91LYLNSkpjiITNcXa7Zj1rpcw8euriHkgfQ19dQ';

// Initialize Supabase
const supabase = supabaseClient.createClient(SUPABASE_URL, SUPABASE_KEY);

// Check if user is logged in
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

// Sign out function
async function signOut() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}
