// js/tenants.js
let currentTenantId = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    const session = await checkAuth();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    
    // Load tenants
    await loadTenants(session.user.id);
    
    // Setup tenant form
    setupTenantForm(session.user.id);
});

async function loadTenants(userId) {
    try {
        const { data: tenants, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        updateTenantsTable(tenants);
        updateMobileTenantsList(tenants);
        
    } catch (error) {
        console.error('Error loading tenants:', error);
        document.getElementById('tenantsTableBody').innerHTML = 
            '<tr><td colspan="6">Error loading tenants</td></tr>';
    }
}

function updateTenantsTable(tenants) {
    const tbody = document.getElementById('tenantsTableBody');
    
    if (!tenants || tenants.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    No tenants yet. Click "Add New Tenant" to get started.
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    tenants.forEach(tenant => {
        const statusClass = getStatusClass(tenant.status);
        const statusText = getStatusText(tenant.status);
        
        html += `
            <tr>
                <td>${tenant.name}</td>
                <td>₱${parseFloat(tenant.monthly_rent).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                <td>${tenant.rent_due_day}th</td>
                <td>
                    ${tenant.has_electric ? '⚡ ' : ''}
                    ${tenant.has_water ? '💧 ' : ''}
                    ${tenant.has_wifi ? '📶 ' : ''}
                </td>
                <td><span class="status-pill ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn-action" onclick="editTenant('${tenant.id}')">✏️ Edit</button>
                    <button class="btn-action btn-danger" onclick="deleteTenant('${tenant.id}')">🗑️ Delete</button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function updateMobileTenantsList(tenants) {
    const mobileList = document.getElementById('mobileTenantsList');
    
    if (!tenants || tenants.length === 0) {
        mobileList.innerHTML = '<p>No tenants yet. Click "Add New Tenant" to get started.</p>';
        return;
    }
    
    let html = '';
    tenants.forEach(tenant => {
        const statusClass = getStatusClass(tenant.status);
        const statusText = getStatusText(tenant.status);
        
        html += `
            <div class="mobile-card">
                <h3>${tenant.name}</h3>
                <p><strong>Rent:</strong> ₱${parseFloat(tenant.monthly_rent).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                <p><strong>Due Day:</strong> ${tenant.rent_due_day}th</p>
                <p><strong>Status:</strong> <span class="${statusClass}">${statusText}</span></p>
                <div class="mobile-actions">
                    <button class="btn-action" onclick="editTenant('${tenant.id}')">Edit</button>
                    <button class="btn-action btn-danger" onclick="deleteTenant('${tenant.id}')">Delete</button>
                </div>
            </div>
        `;
    });
    
    mobileList.innerHTML = html;
}

function getStatusClass(status) {
    switch(status) {
        case 'active': return 'status-active';
        case 'moved_out': return 'status-moved';
        case 'left_without_notice': return 'status-left';
        default: return '';
    }
}

function getStatusText(status) {
    switch(status) {
        case 'active': return 'Active';
        case 'moved_out': return 'Moved Out';
        case 'left_without_notice': return 'Left Without Notice';
        default: return status;
    }
}

function setupTenantForm(userId) {
    const form = document.getElementById('tenantForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Check if this is a new tenant (show consent modal)
        if (!currentTenantId) {
            document.getElementById('consentModal').classList.remove('hidden');
            return;
        }
        
        // If editing existing tenant, save directly
        await saveTenant(userId);
    });
}

async function saveTenant(userId) {
    try {
        const tenantData = {
            user_id: userId,
            name: document.getElementById('tenantName').value,
            monthly_rent: parseFloat(document.getElementById('tenantRent').value),
            rent_due_day: parseInt(document.getElementById('dueDay').value),
            status: document.getElementById('tenantStatus').value,
            has_electric: document.getElementById('hasElectric').checked,
            has_water: document.getElementById('hasWater').checked,
            has_wifi: document.getElementById('hasWifi').checked,
            notes: document.getElementById('tenantNotes').value
        };
        
        if (currentTenantId) {
            // Update existing tenant
            const { error } = await supabase
                .from('tenants')
                .update(tenantData)
                .eq('id', currentTenantId)
                .eq('user_id', userId);
            
            if (error) throw error;
            alert('Tenant updated successfully!');
            
        } else {
            // Create new tenant
            const { error } = await supabase
                .from('tenants')
                .insert([tenantData]);
            
            if (error) throw error;
            alert('Tenant added successfully!');
        }
        
        // Close modal and refresh list
        closeModal('addTenantModal');
        closeModal('consentModal');
        currentTenantId = null;
        await loadTenants(userId);
        
    } catch (error) {
        console.error('Error saving tenant:', error);
        alert('Error saving tenant: ' + error.message);
    }
}

function confirmConsent() {
    // Get the user ID and save the tenant
    checkAuth().then(async (session) => {
        if (session && session.user) {
            await saveTenant(session.user.id);
        }
    });
}

async function editTenant(tenantId) {
    try {
        const session = await checkAuth();
        if (!session) return;
        
        const { data: tenant, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', tenantId)
            .eq('user_id', session.user.id)
            .single();
        
        if (error) throw error;
        
        // Fill the form with tenant data
        document.getElementById('tenantName').value = tenant.name;
        document.getElementById('tenantRent').value = tenant.monthly_rent;
        document.getElementById('dueDay').value = tenant.rent_due_day;
        document.getElementById('tenantStatus').value = tenant.status;
        document.getElementById('hasElectric').checked = tenant.has_electric;
        document.getElementById('hasWater').checked = tenant.has_water;
        document.getElementById('hasWifi').checked = tenant.has_wifi;
        document.getElementById('tenantNotes').value = tenant.notes || '';
        
        // Set current tenant ID and show modal
        currentTenantId = tenantId;
        document.getElementById('addTenantModal').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading tenant:', error);
        alert('Error loading tenant data');
    }
}

async function deleteTenant(tenantId) {
    if (!confirm('Are you sure you want to delete this tenant? This will also delete all related payments and utilities.')) {
        return;
    }
    
    try {
        const session = await checkAuth();
        if (!session) return;
        
        const { error } = await supabase
            .from('tenants')
            .delete()
            .eq('id', tenantId)
            .eq('user_id', session.user.id);
        
        if (error) throw error;
        
        alert('Tenant deleted successfully!');
        await loadTenants(session.user.id);
        
    } catch (error) {
        console.error('Error deleting tenant:', error);
        alert('Error deleting tenant: ' + error.message);
    }
}
