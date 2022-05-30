const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const User=require('./model/user')
const bcrypt = require('bcryptjs')
const jwt=require('jsonwebtoken')
const nodemailer = require('./nodemailer.config')
require('dotenv').config()

const DB = process.env.DB
mongoose.connect(DB, {
	useNewUrlParser: true, 
	useUnifiedTopology: true
}).then(() => {
	console.log(`DB connection successful`);
}).catch((err) => console.log(err));

const JWT_SECRET=process.env.JWT_SECRET

const app = express()
app.use(bodyParser.json())
//routes
app.use('/', express.static(path.join(__dirname, 'static')))
app.use('/signup', express.static(path.join(__dirname, 'static/register.html')))
app.use('/login', express.static(path.join(__dirname, 'static/login.html')))
app.use('/verify/:confirm', express.static(path.join(__dirname, 'static/verify.html')))
app.use('/resendconfirmation', express.static(path.join(__dirname, 'static/resendconf.html')))
app.use('/logout', express.static(path.join(__dirname, 'static/logout.html')))
app.use('/forgetpassword', express.static(path.join(__dirname, 'static/forget.html')))
app.use('/recovery/:confirm', express.static(path.join(__dirname, 'static/reset.html')))//
app.use('/profile', express.static(path.join(__dirname, 'static/profile.html')))
app.use('/update', express.static(path.join(__dirname, 'static/update.html')))
app.use('/delete/:code', express.static(path.join(__dirname, 'static/delet.html')))

function generateCode(len) 
{
	const val= "1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM"
	var code=""
	for(var i=0; i<len; i++)
	{
		code+=val[Math.floor(Math.random() * val.length )];
	}
	return code;
}

// apis
//signup page
app.post('/api/register', async (req, res) => {
    const { name, email, password: plainTextPassword, password: cpassword } = req.body

	if (!name || typeof name !== 'string') {
		return res.json({ status: 'error', idx: '0', error: 'Invalid name' })
	}

    if (!email || typeof email !== 'string') {
		return res.json({ status: 'error', idx: '1', error: 'Invalid email' })
	}

	if (!plainTextPassword || typeof plainTextPassword !== 'string') {
		return res.json({ status: 'error', idx: '2', error: 'Invalid password' })
	}

    if(req.body.password!==req.body.cpassword)
    {
        return res.json({status: 'failed', idx: '3', error: 'password and confirm password did not match'})
    }

	if (plainTextPassword.length < 6) {
		return res.json({
			status: 'error',
			idx: '2',
			error: 'Password too small. Should be atleast 6 characters'
		})
	}

	const password = await bcrypt.hash(plainTextPassword, 10)
    try {
		const code = generateCode(20)
        const response = await User.create({
            name,
            email, 
            password,
			code
        })
		nodemailer.confirmationEmail(response.name, response.email, response.code);
		return res.json({status: 'ok', message: 'Please check email for email confirmation'})
    } catch (error) {
        if (error.code === 11000) {
			// duplicate key
			return res.json({ status: 'error', idx : '1', error: 'Email already in use' })
		}
		else {
			return res.json({ status: 'error', idx : '4', error: 'An unknown error occured' })
		}
    }
})

//login page
app.post('/api/login', async (req, res) => {
	const { email, password } = req.body
	const user = await User.findOne({ email }).lean()
	if (!user) {
		return res.json({ status: 'error', idx: '0', error: 'Invalid email/password' })
	}
	if(user.status==='Pending')
	{
		return res.json({ status: 'error', idx:'2', error: 'Email is not verified yet. Please check mail or request again for verification.' })
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
		const name= user.name
		return res.json({ status: 'ok', data: token, name: name})
	}
	res.json({ status: 'error', idx: '0', error: 'Invalid email/password' })
})

//user validation 
app.post('/api/reval', async (req, res) => {
	const token = req.body.token
	try {
		const user = jwt.verify(token, JWT_SECRET)
		res.json({ status: 'ok' })
	} catch {
		res.json({ status: 'error', error: 'An unknown error occured' })
	}
})

//confirmatio code check
app.post('/api/confirm/:code', async (req, res) => {
	var code=req.params.code
	const user=await User.findOne({code})
	if(!user)
	{
		return res.json({ status : 'failed', error : 'Invalid confirmation code' })
	}
	res.json({ status: 'ok' })
})

//email verification
app.post('/api/verify/:confirm', async (req, res) => {
	try {
		const code=req.params.confirm
		await User.updateOne(
			{
				code,
				status : 'Pending'
			},
			{
				$set:{
					status: 'Active',
					code : ''
				}
			}
		)
		res.json({status: 'ok'})
	} catch (error) {
		console.log(error)
		res.json({ status: 'failed' , error: 'An unknown error occured'})
	}
})

//resend verification email
app.post('/api/resendmail', async (req, res) => {
	const code = generateCode(20);
	const email = req.body.email
	const user = await User.findOne({ email })
	if(!user)
	{
		return res.json({ status: 'failed', idx: '0', error: 'No user found' })
	}
	if(user.status==='Active')
	{
		return res.json({ status: 'failed', idx: '1', error: 'User is already verified. You can login now.' })
	}
	try {
		await User.updateOne(
			{
				email
			},
			{
				$set:{
					code : code
				}
			}
		)
		nodemailer.confirmationEmail(user.name, user.email, code)
		res.json({status: 'ok'})
	} catch (err) {
		res.json({ status:'failed', idx: '1', error:'An unknown error occured' })
	}
})

//password recovery
app.post('/api/resetmail', async (req, res) => {
	const code = generateCode(18);
	const email = req.body.email
	const user = await User.findOne({email})
	if(!user)
	{
		return res.json({ status: 'failed', idx: '0', error: 'Email not register. Please sign up.' })
	}
	try {
		await User.updateOne(
			{
				email
			},
			{
				$set:{
					code : code
				}
			}
		)
		nodemailer.passwordReset(user.name, user.email, code)
		res.json({status: 'ok'})
	} catch (err) {
		res.json({ status:'failed', idx : '1', error:'An unknown error occured' })
	}
})

app.post('/api/recoverpass/:confirm', async (req, res) => {
	const code = req.params.confirm
	const { newpassword: plainTextPassword, cpassword: cpassword } = req.body
	if (!plainTextPassword || typeof plainTextPassword !== 'string') {
		return res.json({ status: 'error', idx: '0', error: 'Invalid password format' })
	}

	if (plainTextPassword.length < 6) {
		return res.json({
			status: 'error',
			idx: '0',
			error: 'Password too small. Should be atleast 6 characters'
		})
	}

	if(plainTextPassword!==cpassword)
	{
		return res.json({
			status: 'failed', 
			idx: '1',
			error: 'password and confirm password did not match'
		})
	}
	try {
		const password = await bcrypt.hash(plainTextPassword, 10)
		await User.updateOne(
			{
				code
			},
			{
				$set:{
					password : password,
					code : ''
				}
			}
		)
		res.json({status: 'ok'})
	} catch (error) {
		console.log(error)
		res.json({ status: 'failed' , idx: '2', error: 'An unknown error occured'})
	}
})

//profile page
app.post('/api/getdetails', async (req, res) => {
	const token = req.body.token
	try {
		const user = jwt.verify(token, JWT_SECRET)
		const _user = await User.findOne({email: user.email})
		res.json({ status: 'ok', name: _user.name, email: _user.email })
	} catch {
		res.json({ status: 'error', error: 'An unknown error occured' })
	}
})

//update page
app.post('/api/update', async (req, res) => {
	try {
		var token = req.body.token
		var name = req.body.name
		var email = req.body.email
		var opassword = req.body.opassword
		var npassword = req.body.npassword
		var cpassword = req.body.cpassword
		let newName = req.body.oldName
		const user = jwt.verify(token, JWT_SECRET)
		const _id = user.id
		const _user = await User.findOne({ _id })
		var password
		if(npassword!==cpassword) {
			return res.json({ status: 'failed', idx: '3', error: 'New password and confirm password are different' })
		}
		if(opassword && await bcrypt.compare(opassword, _user.password)) {
			if(!name && typeof name !== 'string')
			{
				name = _user.name
			}
			if(npassword && typeof npassword === 'string')
			{
				if(npassword.length < 6)
				{
					return res.json({ 
						status: 'failed', 
						idx: '3', 
						error: 'Password too small. Should be atleast 6 characters' 
					})
				}
				password = await bcrypt.hash(opassword, 10)
			}
			else
			{
				password = user.password
			}
			if(email && typeof email === 'string')
			{
				const ouser = await User.findOne({ email })
				if(!ouser) {
					const code = generateCode(20)
					await User.updateOne(
						{ _id },
						{
							$set: {
								name,
								password,
								email: email,
								code: code,
								status: 'Pending'
							}
						}
					)
					nodemailer.confirmationEmail(name, email, code)
					return res.json({ status : 'ok', logout : 'true', name })
				}
				else {
					return res.json({ status: 'failed', idx: '1', error: 'Email already in use' })
				}
			}
			else
			{
				await User.updateOne(
					{ _id },
					{
						$set: {
							name,
							password
						}
					}
				)
				res.json({ status : 'ok', logout : 'false', name })
			}
		}
		else {
			return res.json({ status: 'failed', idx: '2', error: 'Incorrect password' })
		}
	} catch(err) {
		console.log(err)
		res.json({ status : 'failed', idx : '5', error : 'An unknown error occured' })
	}
})

// deleting account
app.post('/api/delete', async (req, res) => {
	try {
		const code = generateCode(15)
		const token = req.body.token
		const user = jwt.verify(token, JWT_SECRET)
		const _id = user.id
		const _user = await User.findOne({ _id })
		await User.deleteOne(
			{ _id }
		)
		nodemailer.deleteAcc(_user.name, _user.email, code)
		res.json({ status : 'ok' })
	} catch (err) {
		res.json({ status : 'failed' })
	}
})

var port=process.env.PORT || 3000

app.listen(port, ()=> {
    console.log(`Server at ${port}`)
})