const bcrypt = require('bcrypt')
const User = require('../models/user')
const jwt = require('jsonwebtoken')

 async function register (req, res) {
    try {
        const { email, password, name } = req.body
        
        const existingUser = await User.findOne({ email })
        
        if (existingUser) {
            return res.status(409).json({error: 'User already exists'})
        }

        const passwordHash = await bcrypt.hash(password, 10)
        const user = await User.create({ email, passwordHash, name })
        
        res.status(201).json({id: user._id, email: user.email, name: user.name })
    } catch (err) {
        res.status(500).json({ error: "Registration failed" });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body
        
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash)
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
          expiresIn: "7d",
        });

        res.cookie("token", token, {
          httpOnly: true,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({ id: user._id, email: user.email, name: user.name });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
    
}

module.exports = { register, login };