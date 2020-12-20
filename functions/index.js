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

app.get('/posts', (request, response) => {
    admin.firestore().collection('posts').get()
    .then(data => {
        let posts = []
        data.forEach(doc => {
            posts.push(doc.data())
        })
        return response.json(posts)
    })
    .catch((err) => console.error(err))
})


app.post('/post', (request, response) => {
    const newPost ={
        body: request.body.body,
        userName: request.body.userName,
        title: request.body.title,
    }
    admin.firestore()
        .collection('posts')
        .add(newPost)
        .then(doc => {
            response.json({message:`document ${doc.id} created successfully`})
        })
        .catch((err) =>{
           response.status(500).json({error: "something went wrong"}) 
           console.error(err)
        })
         
}) 

// Signup route 
app.post('/signup', (request, response) => {
    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        userName: request.body.userName
    }
    // TODO: Validate the data 

    firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
        .then(data => {
           return response.status(201).json({ message: `user ${data.user.uid} signed up successfully`})
            
        })
        .catch(err => {
            console.error(err)
            return response.status(500).json({error: err.code})
        })
})


exports.api = functions.https.onRequest(app)