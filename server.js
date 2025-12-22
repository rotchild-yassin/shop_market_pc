const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, 'users.json');

// Middleware
app.use(cors());
app.use(express.json());

// Initialize users.json file if it doesn't exist
const initializeUsersFile = async () => {
    try {
        await fs.access(USERS_FILE);
        console.log('users.json file exists');
    } catch {
        await fs.writeFile(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
        console.log('Created users.json file');
    }
};

// Read users from file
const readUsers = async () => {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        const parsed = JSON.parse(data);
        
        // Ensure the structure is correct
        if (!parsed || typeof parsed !== 'object') {
            return { users: [] };
        }
        
        if (!parsed.users || !Array.isArray(parsed.users)) {
            return { users: [] };
        }
        
        return parsed;
    } catch (error) {
        console.error('Error reading users file:', error);
        return { users: [] };
    }
};

// Write users to file
const writeUsers = async (data) => {
    try {
        await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log('Successfully wrote to users.json');
    } catch (error) {
        console.error('Error writing to users file:', error);
        throw error;
    }
};

// Validation functions
const isAlpha = (value) => /^[A-Za-z]+$/.test(value);
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return /^[2954]\d{7}$/.test(cleanPhone);
};

// POST endpoint to create a new user
app.post('/api/users', async (req, res) => {
    console.log('Received registration request:', req.body);
    
    try {
        const { firstName, lastName, email, phone, password } = req.body;

        // Validation
        const errors = [];

        if (!firstName || firstName.trim() === '') {
            errors.push('First name is required');
        } else if (!isAlpha(firstName)) {
            errors.push('First name must contain only letters');
        } else if (firstName.length > 7) {
            errors.push('First name must be 7 characters or less');
        }

        if (!lastName || lastName.trim() === '') {
            errors.push('Last name is required');
        } else if (!isAlpha(lastName)) {
            errors.push('Last name must contain only letters');
        } else if (lastName.length > 7) {
            errors.push('Last name must be 7 characters or less');
        }

        if (!email || email.trim() === '') {
            errors.push('Email is required');
        } else if (!isValidEmail(email)) {
            errors.push('Please enter a valid email address');
        }

        if (!phone || phone.trim() === '') {
            errors.push('Phone number is required');
        } else if (!isValidPhone(phone)) {
            errors.push('Phone must be exactly 8 digits starting with 2, 9, 5, or 4');
        }

        if (!password || password.trim() === '') {
            errors.push('Password is required');
        } else if (password.indexOf(' ') !== -1) {
            errors.push('Password cannot contain spaces');
        } else if (password.length > 10) {
            errors.push('Password must be 10 characters or less');
        }

        if (errors.length > 0) {
            console.log('Validation errors:', errors);
            return res.status(400).json({ success: false, errors });
        }

        // Read existing users
        const data = await readUsers();
        
        // Ensure users array exists
        if (!data.users || !Array.isArray(data.users)) {
            data.users = [];
        }
        
        console.log('Current users count:', data.users.length);

        // Check if email already exists
        const emailExists = data.users.some(user => user.email.toLowerCase() === email.toLowerCase());
        if (emailExists) {
            console.log('Email already exists:', email);
            return res.status(400).json({ 
                success: false, 
                errors: ['Email already registered'] 
            });
        }

        // Check if phone already exists
        const cleanPhone = phone.replace(/\D/g, '');
        const phoneExists = data.users.some(user => {
            const existingCleanPhone = user.phone.replace(/\D/g, '');
            return existingCleanPhone === cleanPhone;
        });
        if (phoneExists) {
            console.log('Phone already exists:', phone);
            return res.status(400).json({ 
                success: false, 
                errors: ['Phone number already registered'] 
            });
        }

        // Create new user object
        const newUser = {
            id: Date.now().toString(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim().toLowerCase(),
            phone: cleanPhone,
            password: password, // In production, you should hash the password!
            createdAt: new Date().toISOString()
        };

        // Add user to array
        data.users.push(newUser);

        // Save to file
        await writeUsers(data);

        console.log('New user registered successfully:', { 
            id: newUser.id, 
            email: newUser.email,
            phone: newUser.phone 
        });

        // Return success (don't send password back)
        const userResponse = {
            id: newUser.id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
            phone: newUser.phone,
            createdAt: newUser.createdAt
        };

        return res.status(201).json({ 
            success: true, 
            message: 'User created successfully',
            user: userResponse 
        });

    } catch (error) {
        console.error('Server error details:', error);
        return res.status(500).json({ 
            success: false, 
            errors: ['Server error occurred: ' + error.message] 
        });
    }
});

// ✅ POST endpoint for login
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email et mot de passe requis'
            });
        }

        const data = await readUsers();

        // Find user with matching email and password
        const user = data.users.find(
            u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );

        if (!user) {
            // Check if email exists
            const emailExists = data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (emailExists) {
                return res.json({ success: false, error: 'Mot de passe incorrect' });
            } else {
                return res.json({ success: false, error: 'Aucun compte trouvé avec cet email' });
            }
        }

        // Success
        return res.json({
            success: true,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// GET endpoint to retrieve all users (for testing)
app.get('/api/users', async (req, res) => {
    try {
        const data = await readUsers();
        // Remove passwords from response
        const usersWithoutPasswords = data.users.map(user => {
            return {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                createdAt: user.createdAt
            };
        });
        res.json({ success: true, users: usersWithoutPasswords, count: usersWithoutPasswords.length });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            success: false, 
            errors: ['Error fetching users: ' + error.message] 
        });
    }
});

// DELETE endpoint to delete all users (for testing)
app.delete('/api/users', async (req, res) => {
    try {
        await writeUsers({ users: [] });
        console.log('All users deleted');
        res.json({ success: true, message: 'All users deleted' });
    } catch (error) {
        console.error('Error deleting users:', error);
        res.status(500).json({ 
            success: false, 
            errors: ['Error deleting users: ' + error.message] 
        });
    }
});

// Start server
const startServer = async () => {
    try {
        await initializeUsersFile();
        app.listen(PORT, () => {
            console.log(`==========================================`);
            console.log(`Server is running on http://localhost:${PORT}`);
            console.log(`Users will be saved to: ${USERS_FILE}`);
            console.log(`==========================================`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
