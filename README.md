Alla endpoints

Skapa Konto
POST  http://localhost:3000/users

Redigera Konto
PUT   http://localhost:3000/users/userId

Ta bort konto
DELETE  http://localhost:3000/users/userId

Skapa Post 
POST  http://localhost:3000/users/userId/posts

Redigera Post 
PUT   http://localhost:3000/posts/postId

Ta bort Post 
DELETE http://localhost:3000/posts/postId

Visa alla användare 
GET   http://localhost:3000/users

Visa alla posts
GET   http://localhost:3000/posts

Visa alla posts från en specifik användare
GET   http://localhost:3000/users/userId/posts

Redigera Bio i profil
PUT   http://localhost:3000/users/userId/profile

Login
POST  http://localhost:3000/login


Kör för att synca prisma schema med databas
npx prisma migrate dev