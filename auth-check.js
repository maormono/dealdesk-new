// Authentication Check Module for DealDesk
// This script protects pages by checking for valid session

(function() {
    'use strict';
    
    // Check if user is authenticated
    function checkAuth() {
        // Get session from storage
        const sessionData = sessionStorage.getItem('dealdesk_session') || localStorage.getItem('dealdesk_session');
        
        if (!sessionData) {
            // No session found, redirect to login
            redirectToLogin();
            return false;
        }
        
        try {
            const session = JSON.parse(sessionData);
            
            // Check if session is valid and not expired
            if (!session.authenticated || !session.expires || session.expires < Date.now()) {
                // Session expired or invalid
                clearSession();
                redirectToLogin();
                return false;
            }
            
            // Session is valid
            return true;
            
        } catch (e) {
            // Invalid session data
            clearSession();
            redirectToLogin();
            return false;
        }
    }
    
    // Redirect to login page
    function redirectToLogin() {
        const currentPath = window.location.pathname;
        if (!currentPath.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
    
    // Clear session data
    function clearSession() {
        sessionStorage.removeItem('dealdesk_session');
        localStorage.removeItem('dealdesk_session');
    }
    
    // Add logout functionality
    window.logout = function() {
        clearSession();
        redirectToLogin();
    };
    
    // Add session info to page
    function displayUserInfo() {
        const sessionData = sessionStorage.getItem('dealdesk_session') || localStorage.getItem('dealdesk_session');
        if (sessionData) {
            const session = JSON.parse(sessionData);
            
            // Create user info element if it doesn't exist
            if (!document.getElementById('userInfo')) {
                const userInfoHtml = `
                    <div id="userInfo" class="fixed top-4 right-4 z-50 flex items-center gap-3 bg-white shadow-lg rounded-lg px-4 py-2">
                        <span class="text-sm text-gray-600">
                            <svg class="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            ${session.email}
                        </span>
                        <button onclick="logout()" class="text-sm text-red-600 hover:text-red-700 font-medium">
                            Logout
                        </button>
                    </div>
                `;
                document.body.insertAdjacentHTML('afterbegin', userInfoHtml);
            }
        }
    }
    
    // Run authentication check on page load
    document.addEventListener('DOMContentLoaded', function() {
        // Skip auth check for login page
        if (window.location.pathname.includes('login.html')) {
            return;
        }
        
        // Check authentication
        if (checkAuth()) {
            displayUserInfo();
            
            // Refresh session expiry on activity
            document.addEventListener('click', function() {
                const sessionData = sessionStorage.getItem('dealdesk_session') || localStorage.getItem('dealdesk_session');
                if (sessionData) {
                    const session = JSON.parse(sessionData);
                    session.expires = Date.now() + (24 * 60 * 60 * 1000); // Extend by 24 hours
                    sessionStorage.setItem('dealdesk_session', JSON.stringify(session));
                    if (localStorage.getItem('dealdesk_session')) {
                        localStorage.setItem('dealdesk_session', JSON.stringify(session));
                    }
                }
            });
        }
    });
    
    // Also check immediately in case DOM is already loaded
    if (document.readyState !== 'loading') {
        if (!window.location.pathname.includes('login.html')) {
            checkAuth() && displayUserInfo();
        }
    }
})();