document.addEventListener('DOMContentLoaded', () => {
    const accountForm = document.getElementById('accountForm');
    const logoutBtn = document.getElementById('logout');



// Handle form submission
accountForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(accountForm);
    const data = {
        name: formData.get('fullname'),
        email: formData.get('email'),
        username: formData.get('username'),
        phone: formData.get('phone')
    };

    fetch('/update-account', {
        method: 'POST', // Use POST for updating
        body: formData // Send as FormData
    })

});
        

  // Logout button functionality
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logoutBtn.disabled = true; 
        const loadingMessage = document.createElement('span');
        loadingMessage.innerText = 'Logging out...';
        logoutBtn.parentElement.appendChild(loadingMessage);

        fetch('/logout', { method: 'POST' })
            .then(response => {
                if (response.ok) {
                    window.location.href = '/login'; 
                } else {
                    throw new Error('Logout failed, please try again.');
                }
            })
            .catch(error => {
                console.error('Error logging out:', error);
                alert(error.message || 'An error occurred while logging out.');
            })
            .finally(() => {
                logoutBtn.disabled = false; 
                if (loadingMessage) {
                    loadingMessage.remove(); 
                }
            });
    });
} 
else {
    console.error('Logout button not found');
}


// Retrieve user data from local storage
const user = JSON.parse(localStorage.getItem('user'));
console.log(user); // Check the user object in the console to ensure it's correct

if (user) {
    const displayName = user.name || user.username || 'Guest'; // Fallback if both are absent
    document.getElementById('user-name').innerText = `Welcome, ${displayName}!`;
    document.getElementById('user-info').style.display = 'block'; // Show user info
} else {
    document.getElementById('user-name').innerText = 'Welcome, Guest!'; // Default message for guest
    document.getElementById('user-info').style.display = 'none'; // Hide user info if not logged in
}

// Logout functionality
document.getElementById('logout').addEventListener('click', function(e) {
    e.preventDefault();
    localStorage.removeItem('user'); // Clear user data from local storage
    document.getElementById('user-info').style.display = 'none'; // Hide user info
    window.location.href = 'login.html'; // Redirect to login page
});


  // Fetch user data when the page loads
  fetch('/user')
  .then(response => response.json())
  .then(data => {
      if (data.user) {
          document.getElementById('fullname').value = data.user.name; // Update to 'name'
          document.getElementById('email').value = data.user.email;
          document.getElementById('username').value = data.user.username;
          document.getElementById('phone').value = data.user.phone;
      } else {
          window.location.href = '/login'; // Redirect if not logged in
      }
  })
  .catch(error => console.error('Error fetching user data:', error));
});
