const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, 'users.json');

/* ===================== MIDDLEWARE ===================== */
app.use(cors());
app.use(express.json());

/* ===================== INIT FILE ===================== */
const initializeUsersFile = async () => {
    try {
        await fs.access(USERS_FILE);
    } catch {
        await fs.writeFile(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
    }
};

/* ===================== READ / WRITE ===================== */
const readUsers = async () => {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        const parsed = JSON.parse(data);
        return parsed.users ? parsed : { users: [] };
    } catch {
        return { users: [] };
    }
};

const writeUsers = async (data) => {
    await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
};

/* ===================== VALIDATION ===================== */
const isAlpha = (value) => /^[A-Za-z]+$/.test(value);
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone) => /^[2954]\d{7}$/.test(phone.replace(/\D/g, ''));

/* ===================== REGISTER ===================== */
app.post('/api/users', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password } = req.body;
        const errors = [];

        if (!firstName || !isAlpha(firstName) || firstName.length > 7)
            errors.push('Invalid first name');

        if (!lastName || !isAlpha(lastName) || lastName.length > 7)
            errors.push('Invalid last name');

        if (!email || !isValidEmail(email))
            errors.push('Invalid email');

        if (!phone || !isValidPhone(phone))
            errors.push('Invalid phone');

        if (!password || password.includes(' ') || password.length > 10)
            errors.push('Invalid password');

        if (errors.length)
            return res.status(400).json({ success: false, errors });

        const data = await readUsers();
        const cleanPhone = phone.replace(/\D/g, '');

        if (data.users.some(u => u.email === email.toLowerCase()))
            return res.json({ success: false, errors: ['Email already exists'] });

        if (data.users.some(u => u.phone === cleanPhone))
            return res.json({ success: false, errors: ['Phone already exists'] });

        const newUser = {
            id: Date.now().toString(),
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone: cleanPhone,
            password,
            createdAt: new Date().toISOString()
        };

        data.users.push(newUser);
        await writeUsers(data);

        res.status(201).json({
            success: true,
            user: {
                id: newUser.id,
                firstName,
                lastName,
                email,
                phone: cleanPhone,
                createdAt: newUser.createdAt
            }
        });

    } catch (e) {
        res.status(500).json({ success: false, errors: ['Server error'] });
    }
});

/* ===================== LOGIN (EMAIL OR PHONE) ===================== */
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, phone, password } = req.body;

        if ((!email && !phone) || !password) {
            return res.json({
                success: false,
                error: 'Email / Téléphone et mot de passe requis'
            });
        }

        const data = await readUsers();

        const user = data.users.find(u => {
            if (email) {
                return u.email === email.toLowerCase() && u.password === password;
            }
            if (phone) {
                return u.phone === phone && u.password === password;
            }
        });

        if (!user) {
            return res.json({
                success: false,
                error: 'Email / Téléphone ou mot de passe incorrect'
            });
        }

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

    } catch (e) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

/* ===================== GET USERS ===================== */
app.get('/api/users', async (req, res) => {
    const data = await readUsers();
    res.json({
        success: true,
        users: data.users.map(u => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            phone: u.phone,
            createdAt: u.createdAt
        }))
    });
});

/* ===================== DELETE USERS ===================== */
app.delete('/api/users', async (req, res) => {
    await writeUsers({ users: [] });
    res.json({ success: true });
});

/* ===================== START SERVER ===================== */
initializeUsersFile().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});
