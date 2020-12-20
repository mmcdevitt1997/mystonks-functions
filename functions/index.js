const functions = require('firebase-functions');
const admin = require('firebase-admin')

admin.initializeApp()

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello world");
});

exports.getPosts = functions.https.onRequest((request, response) => {
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

exports.createPost = functions.https.onRequest((request, response) => {
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