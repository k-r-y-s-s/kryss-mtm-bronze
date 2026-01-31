// js/auth.js
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    checkAuth().then(session => {
        if (session && window.location.pathname.includes('login.html')) {
            window.location.href = 'dashboard.html';
        }
        if (!session && !window.location.pathname.includes('login.html') && 
            !window.location.pathname.includes('signup.html')) {
            window.location.href = 'login.html';
        }
    });

    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                if (error) throw error;
                
                // Show loading screen for 5 seconds
                document.getElementById('loadingScreen').classList.remove('hidden');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 5000);
                
            } catch (error) {
                alert('Login failed: ' + error.message);
            }
        });
    }

    // Signup form handler
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }
            
            try {
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password
                });
                
                if (error) throw error;
                
                // Create user profile
                if (data.user) {
                    await supabase
                        .from('profiles')
                        .insert([{ 
                            id: data.user.id, 
                            email: data.user.email,
                            trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                        }]);
                }
                
                alert('Account created successfully! Please login.');
                window.location.href = 'login.html';
                
            } catch (error) {
                alert('Signup failed: ' + error.message);
            }
        });
    }
});
