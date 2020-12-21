const functions = require('firebase-functions');
const admin = require('firebase-admin')
const app = require('express')()

admin.initializeApp()

const firebaseConfig = {
    apiKey: "AIzaSyCK2Y6kA08nT2yX0V1YaH_Gm1Ls_XlHnRc",
    authDomain: "my-stonks.firebaseapp.com",
    databaseURL: "https://my-stonks.firebaseio.com",
    projectId: "my-stonks",
    storageBucket: "my-stonks.appspot.com",
    messagingSenderId: "108739936062",
    appId: "1:108739936062:web:362b865d41155c0b9df66f",
    measurementId: "G-EW5N2JNJXG"
  }


const firebase = require('firebase');
const { request, response } = require('express');
firebase.initializeApp(firebaseConfig)

const db = admin.firestore()

app.get('/posts', (request, response) => {
   db.collection('posts').get()
    .then(data => {
        let posts = []
        data.forEach(doc => {
            posts.push(doc.data())
        })
        return response.json(posts)
    })
    .catch((err) => console.error(err))
})

const FBAuth = (request, response, next) => {
    let idToken
    if(request.headers.authorization && request.headers.authorization.startsWith('Bearer ')){
        idToken = request.headers.authorization.split('Bearer ')[1]
    }else{ 
        console.error('No token found')
        return response.status(403).json({ error: 'Unauthorized'})
    }
    admin.auth().verifyIdToken(idToken)
    .then(decodedToken =>{
        request.user = decodedToken 
        console.log(decodedToken)
        return db.collection('users')
            .where('userId', '==', request.user.uid)
            .limit(1)
            .get()
    })
    .then(data => {
        request.user.userName = data.docs[0].data().userName
        return next()
    })
    .catch( err => {
        console.error('Error while verifying token', err)
        return response.status(403).json(err)
    })
}
app.post('/post', FBAuth, (request, response) => {
    const newPost ={
        body: request.body.body,
        userName: request.user.userName,
        title: request.body.title,
    }
    db
        .collection('posts')
        .add(newPost)
        .then((doc) => {
            response.json({message:`document ${doc.id} created successfully`})
        })
        .catch((err) =>{
           response.status(500).json({error: "something went wrong"}) 
           console.error(err)
        })
})

const isEmpty = (string) => {
    if(string.trim() === '') return true
    else return false 
}

const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    if(email.match(regEx)) return true 
    else return false
}

// Signup route 
app.post('/signup', (request, response) => {
    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        userName: request.body.userName
    }

    let errors = {} 

    if(isEmpty(newUser.email)) {
        errors.email = 'Must not be empty'
    }else if(!isEmail(newUser.email)){
        errors.email = 'Must be a valid email address'
    }

    if(isEmpty(newUser.password)) errors.password = 'Must not be empty'
    if(newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'Passwords must match'
    if(isEmpty(newUser.userName)) errors.userName = 'Must not be empty'

    if(Object.keys(errors).length > 0) return response.status(400).json(errors)
  

    let token, userId 
    db.doc(`/users/${newUser.userName}`).get()
        .then(doc => {
        if(doc.exists){
           return response.status(400).json({handle: 'this handle is already taken'})
        } else {
            return firebase
            .auth()
            .createUserWithEmailAndPassword(newUser.email, newUser.password)
        }
        })
        .then(data => {
           userId = data.user.uid
           return data.user.getIdToken()
        })
        .then(idToken => {
           token = idToken
           const userCredentials = {
               userName: newUser.userName,
               email: newUser.email,
               createdAt: new Date().toISOString(),
               userId: userId
           }
           return db.doc(`/users/${newUser.userName}`).set(userCredentials)
        })
        .then(() =>{
         return response.status(201).json({ token })
        })
        .catch(err => {
            console.error(err)
            if(err.code === 'auth/email-already-in-use'){
                return response.status(400).json({email: 'Email is already in use'})
            }else{
                return response.status(500).json({error: err.code})
            }
        })
})

app.post('/login',(request, response) =>{
    const user = {
        email: request.body.email,
        password: request.body.password
    }
    let errors = {}
    
    if(isEmpty(user.email)) errors.email = 'Must not be empty'
    if(isEmpty(user.password)) errors.password = 'Must not be empty'

    if(Object.keys(errors).length > 0) return response.status(400).json(errors)

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
        return data.user.getIdToken()
    })
    .then(token =>{
        return response.json({token})
    })
    .catch(err =>{
        console.error(err)
        if(err.code === 'auth/wrong-password'){
            return response.status(403).json({ general: 'Wrong credentials, please try again'})
        }else return response.status(500).json({error: err.code})
    })
})

exports.api = functions.https.onRequest(app)