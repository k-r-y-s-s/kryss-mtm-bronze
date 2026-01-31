// js/dashboard.js
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    const session = await checkAuth();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    
    // Load dashboard data
    await loadDashboardData(session.user.id);
    
    // Update every 30 seconds
    setInterval(async () => {
        await loadDashboardData(session.user.id);
    }, 30000);
});

async function loadDashboardData(userId) {
    try {
        // Get active tenants
        const { data: tenants, error: tenantsError } = await supabase
            .from('tenants')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active');
        
        if (tenantsError) throw tenantsError;
        
        // Calculate monthly rent total
        const monthlyRent = tenants.reduce((total, tenant) => {
            return total + parseFloat(tenant.monthly_rent);
        }, 0);
        
        // Get current month utilities
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const { data: utilities, error: utilitiesError } = await supabase
            .from('utilities')
            .select('amount')
            .eq('user_id', userId)
            .gte('period_end', firstDayOfMonth.toISOString())
            .lte('period_end', lastDayOfMonth.toISOString());
        
        if (utilitiesError) throw utilitiesError;
        
        const monthlyUtilities = utilities.reduce((total, utility) => {
            return total + parseFloat(utility.amount);
        }, 0);
        
        // Get payments from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: payments, error: paymentsError } = await supabase
            .from('payments')
            .select('amount')
            .eq('user_id', userId)
            .gte('payment_date', thirtyDaysAgo.toISOString());
        
        if (paymentsError) throw paymentsError;
        
        const paymentsReceived = payments.reduce((total, payment) => {
            return total + parseFloat(payment.amount);
        }, 0);
        
        // Update the dashboard
        document.getElementById('monthlyRent').textContent = 
            '₱' + monthlyRent.toLocaleString('en-PH', { minimumFractionDigits: 2 });
        document.getElementById('monthlyUtilities').textContent = 
            '₱' + monthlyUtilities.toLocaleString('en-PH', { minimumFractionDigits: 2 });
        document.getElementById('paymentsReceived').textContent = 
            '₱' + paymentsReceived.toLocaleString('en-PH', { minimumFractionDigits: 2 });
        document.getElementById('activeTenants').textContent = tenants.length;
        
        // Load needs attention (tenants with negative balance)
        await loadNeedsAttention(userId);
        
        // Load recent activity
        await loadRecentActivity(userId);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Error loading dashboard data');
    }
}

async function loadNeedsAttention(userId) {
    try {
        // Get all tenants
        const { data: tenants, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active');
        
        if (error) throw error;
        
        const attentionList = document.getElementById('attentionList');
        
        // For now, just show if any tenant has overdue rent
        // In a real app, you would calculate balances
        const needsAttention = tenants.filter(tenant => {
            const today = new Date();
            const dueDate = new Date(today.getFullYear(), today.getMonth(), tenant.rent_due_day);
            return today > dueDate;
        });
        
        if (needsAttention.length === 0) {
            attentionList.innerHTML = '<p>No issues found. All tenants are up to date.</p>';
            return;
        }
        
        let html = '';
        needsAttention.forEach(tenant => {
            html += `
                <div class="attention-item">
                    <strong>${tenant.name}</strong> - Rent overdue since ${tenant.rent_due_day}th
                </div>
            `;
        });
        
        attentionList.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading attention list:', error);
    }
}

async function loadRecentActivity(userId) {
    try {
        const { data: activities, error } = await supabase
            .from('ledger_entries')
            .select(`
                *,
                tenants(name)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        const activityList = document.getElementById('activityList');
        
        if (!activities || activities.length === 0) {
            activityList.innerHTML = '<p>No recent activity</p>';
            return;
        }
        
        let html = '';
        activities.forEach(activity => {
            const date = new Date(activity.created_at).toLocaleDateString();
            const typeClass = activity.type === 'payment' ? 'text-green-600' : 'text-blue-600';
            const sign = activity.type === 'payment' ? '+' : '-';
            
            html += `
                <div class="activity-item">
                    <div class="activity-date">${date}</div>
                    <div class="activity-details">
                        <strong>${activity.tenants?.name || 'Unknown'}</strong> - 
                        ${activity.category} ${activity.type}
                    </div>
                    <div class="activity-amount ${typeClass}">
                        ${sign}₱${parseFloat(activity.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </div>
                </div>
            `;
        });
        
        activityList.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
        activityList.innerHTML = '<p>Error loading activity</p>';
    }
}
