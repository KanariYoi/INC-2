// Import required packages
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt'); // For password hashing
const nodemailer = require('nodemailer'); // For sending emails
const { body, validationResult } = require('express-validator');
const multer = require('multer');

// Create an instance of express
const app = express();
const upload = multer(); // Initialize multer

const PORT = 4000; // Your server port

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());

// Set up session middleware
app.use(session({
    secret: 'your_secret_key', // Change this to a more secure key in production
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Create connection to MySQL database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',   // Replace with your MySQL username
    password: 'mysql', // Replace with your MySQL password
    database: 'barbershop_db'  // Replace with your MySQL database name
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM customer_tb WHERE username = ?', [username], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Server error' });
        }
        if (results.length === 0) {
            return res.status(401).json({ message: 'Wrong username or password' });
        }
        const user = results[0];
        bcrypt.compare(password, user.password, (err, match) => {
            if (err) {
                return res.status(500).json({ message: 'Server error' });
            }
            if (!match) {
                return res.status(401).json({ message: 'Wrong username or password' });
            }
            req.session.user = { id: user.id, fullname: user.fullname, username: user.username };
            res.json({ message: 'Login successful', user: req.session.user });
        });
    });
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Failed to log out' });
        }
        res.status(200).json({ message: 'Logout successful' });
    });
});

// Get user session information
app.get('/user', (req, res) => {
    if (req.session.user) {
        // Return the user data
        res.json({ user: req.session.user });
    } else {
        // If the user is not logged in, respond with a 401 Unauthorized
        res.status(401).json({ message: 'User not logged in' });
    }
});




// Reservation route
app.post('/reservations', (req, res) => {
    const { name, phone, email, reservation_date, reservation_time, service_id, barber_id } = req.body;
    const customer_id = req.session.user ? req.session.user.id : null;

    if (!customer_id) {
        console.log("User not logged in.");
        return res.status(401).json({ message: 'User not logged in' });
    }

    console.log("Received reservation data:", req.body);

    // Check if the time/date is already booked
    db.query('SELECT * FROM reservation_tb WHERE reservation_date = ? AND reservation_time = ?', [reservation_date, reservation_time], (err, results) => {
        if (err) {
            console.error("Database query error:", err);
            return res.status(500).json({ message: 'Server error' });
        }
        
        if (results.length > 0) {
            console.log("Date/time slot already booked.");
            return res.status(409).json({ message: 'This time/date has already been booked.' });
        }

        // Inserting the reservation into the database
        db.query(
            'INSERT INTO reservation_tb (customer_id, name, phone, email, reservation_date, reservation_time, service_id, barber_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
            [customer_id, name, phone, email, reservation_date, reservation_time, service_id, barber_id],
            (err, results) => {
                if (err) {
                    console.error("Failed to create reservation:", err); // Log the error for debugging
                    return res.status(500).json({ message: 'Failed to create reservation' });
                }

                console.log("Reservation successfully created.");
                res.status(201).json({ message: 'Reservation created successfully' });
            }
        );
    });
});


// Update account route with validation
app.post('/update-account', [
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('username').isString().notEmpty().withMessage('Username is required'),
    body('phone').isString().notEmpty().withMessage('Phone number is required')
], (req, res) => {
    // Validate incoming request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // Check if the user is logged in
    if (!req.session.user) {
        console.log("No user logged in.");
        return res.status(401).json({ message: 'User not logged in' });
    }

    // Destructure data from request body
    const { name, email, username, phone } = req.body;
    const userId = req.session.user.id; // Assuming user ID is stored in the session

    // Update user data in the database
    db.query(
        'UPDATE customer_tb SET name = ?, email = ?, username = ?, phone = ? WHERE customer_id = ?',
        [name, email, username, phone, userId], // Update the ID to match your database column
        (err, result) => { // Use 'result' instead of 'res' to avoid confusion with the Express response object
            if (err) {
                console.error('Database error:', err); // Log error for debugging
                return res.status(500).json({ message: 'Failed to update account' });
            }
            if (result.affectedRows === 0) { // Check if any rows were affected
                return res.status(404).json({ message: 'User not found or no changes made' });
            }
            res.json({ message: 'Account updated successfully' });
        }
    );
});

// Register route
app.post('/register', (req, res) => {
    const { name, phone, email, username, password } = req.body;
    db.query('SELECT * FROM customer_tb WHERE username = ? OR email = ?', [username, email], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Server error' });
        }
        if (results.length > 0) {
            return res.status(409).json({ message: 'Username or email already exists' });
        }
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Error hashing password:', err);
                return res.status(500).json({ message: 'Server error' });
            }
            db.query('INSERT INTO customer_tb (name, phone, email, username, password) VALUES (?, ?, ?, ?, ?)', 
                [name, phone, email, username, hashedPassword], (err, results) => {
                if (err) {
                    console.error('Failed to create user:', err);
                    return res.status(500).json({ message: 'Failed to register user' });
                }
                res.status(201).json({ message: 'User registered successfully' });
            });
        });
    });
});

// Start the server only once here
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
