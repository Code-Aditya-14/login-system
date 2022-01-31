const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const User=require('./model/user')
const bcrypt = require('bcryptjs')
const jwt=require('jsonwebtoken')
const key=require('./config')

mongoose.connect('mongodb://localhost:27017/login-sys')

const JWT_SECRET=key.JWT_SECRET

const app = express()
app.use('/', express.static(path.join(__dirname, 'static')))
app.use(bodyParser.json())

app.post('/api/reval', async (req, res) => {
	const token = req.body.token
	try {
		const user = jwt.verify(token, JWT_SECRET)
		res.json({ status: 'ok' })
	} catch {
		res.json({ status: 'error', error: ';))' })
	}
})

app.post('/api/login', async (req, res) => {
	const { email, password } = req.body
	const user = await User.findOne({ email }).lean()

	if (!user) {
		return res.json({ status: 'error', error: 'Invalid email/password' })
	}

	if (await bcrypt.compare(password, user.password)) {
		// the email, password combination is successful
		
		const token = jwt.sign(
			{
				id: user._id,
				email: user.email
			},
			JWT_SECRET,
			{
			  expiresIn: 3600,
			},
		)
		return res.json({ status: 'ok', data: token})
	}
	res.json({ status: 'error', error: 'Invalid email/password' })
})

app.post('/api/change', async (req, res) => {
	const { token, newpassword: plainTextPassword } = req.body
	console.log(token)

	if (!plainTextPassword || typeof plainTextPassword !== 'string') {
		return res.json({ status: 'error', error: 'Invalid password' })
	}

	if (plainTextPassword.length < 5) {
		return res.json({
			status: 'error',
			error: 'Password too small. Should be atleast 6 characters'
		})
	}

	try {
		const user = jwt.verify(token, JWT_SECRET)

		const _id = user.id

		const password = await bcrypt.hash(plainTextPassword, 10)

		await User.updateOne(
			{ _id },
			{
				$set: { password }
			}
		)
		res.json({ status: 'ok' })
	} catch (error) {
		console.log(error)
		res.json({ status: 'error', error: ';))' })
	}
})

app.post('/api/register', async (req, res) => {
    const { name, email, password: plainTextPassword, password: cpassword } = req.body

	if (!name || typeof name !== 'string') {
		return res.json({ status: 'error', error: 'Invalid name' })
	}

    if (!email || typeof email !== 'string') {
		return res.json({ status: 'error', error: 'Invalid email' })
	}

	if (!plainTextPassword || typeof plainTextPassword !== 'string') {
		return res.json({ status: 'error', error: 'Invalid password' })
	}

    if(req.body.password!==req.body.cpassword)
    {
        return res.json({status: 'failed', error: 'password and confirm password did not match'})
    }

	if (plainTextPassword.length < 5) {
		return res.json({
			status: 'error',
			error: 'Password too small. Should be atleast 6 characters'
		})
	}

	const password = await bcrypt.hash(plainTextPassword, 10)
    try {
        const response = await User.create({
            name,
            email, 
            password
        })
		const token = jwt.sign(
			{
				id: response._id,
				email: response.email
			},
			JWT_SECRET,
			{
			  expiresIn: 3600, 
			},
		)
		console.log('User created successfully: ', response, token)
		return res.json({status: 'ok', data: token})
    } catch (error) {
        if (error.code === 11000) {
			// duplicate key
			return res.json({ status: 'error', error: 'Email already in use' })
		}
		throw error
    }
})

var port=process.env.PORT || 3000

app.listen(port, ()=> {
    console.log('server at ', port)
})