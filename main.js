// This will run on page load to check if the user is logged in
document.addEventListener('DOMContentLoaded', () => {
    fetch('/user')
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                document.getElementById('accountLink').style.display = 'block'; // Show the account link if logged in
            }
        })
        .catch(error => console.error('Error fetching user data:', error));
});
