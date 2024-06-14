import express, { Express, Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import cors from 'cors'
import jwt from 'jsonwebtoken';
const bcrypt = require('bcryptjs')


const app: Express = express();
const prisma = new PrismaClient();
const PORT = 3000;

const JWT_SECRET = 'Jason_Derulo';
const JWT_EXPIRES_IN = '2h';






// ******************
//     MIDDLEWARE
// ******************

interface UserData {
    name?: string;
    email?: string;
    password?: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: { userId: number, email: string };
        }
    }
}

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.sendStatus(401);
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};


const authorizeUser = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.userId !== Number(req.params.id)) {
        return res.status(403).json({ message: "Access denied: you can only modify your own account." });
    }
    next();
};


// ******************
//     Routes
// ******************
app.use(express.json());
app.use(cors());


app.get('/', (req: Request, res: Response) => {
    res.send('Hello from the other side!. IVE CALLED A THOUSAND TIMES');
});

app.get('/users', async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                posts: true,
                profile: true
            }
        });
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch users', error });
    }
});

//Login
app.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }
    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(400).json({ message: "Invalid password or email" });
        };
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        res.json({ message: "Login Successful", token })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error has occurred during the login process" });
    }
});


// Create user
app.post('/users', async (req: Request, res: Response) => {
    const { name, email, password, posts, bio } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, Email and Password are required" });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                posts: posts ? {
                    create: posts,
                } : undefined,
                profile: bio ? {
                    create: { bio },
                } : undefined,
            },
            include: {
                posts: true,
                profile: true
            },
        });
        res.status(201).json(newUser);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Failed to create user', error });
    }
});

// Uppdatera en användare
app.put('/users/:id', authenticateToken, authorizeUser, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, email, password } = req.body;

    try {
        let userdata: UserData = { name, email };
        if (password) {
            userdata.password = await bcrypt.hash(password, 10);
        }
        const user = await prisma.user.update({
            where: { id: Number(id) },
            data: userdata
        });

        res.json(user);
    } catch (error) {
        res.status(404).json({ message: "User not found", error });
    }
});


//Skapa posts
app.post('/users/:userId/posts', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { title, content, published } = req.body;
    try {
        const newPost = await prisma.post.create({
            data: {
                title,
                content,
                published,
                authorId: Number(userId),
            },
        });
        res.status(201).json(newPost);
    } catch (error) {
        console.error("error creating post", error);
        res.status(400).json({ message: 'Failed to create new post', error });
    }
});

//Updatera en post
app.put('/posts/:postId', async (req: Request, res: Response) => {
    const { postId } = req.params;
    const { title, content, published } = req.body;
    try {
        const updatedPost = await prisma.post.update({
            where: { id: Number(postId) },
            data: {
                title,
                content,
                published,
            },
        });
        res.json(updatedPost);
    } catch (error) {
        console.error('could not update post', error);
        res.status(404).json({ message: "Post not found", error });
    }
});


//Updatera Bio
app.put('/users/:userId/profile', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { bio } = req.body;
    try {
        const updatedProfile = await prisma.profile.upsert({
            where: { userId: Number(userId) },
            update: { bio },
            create: {
                bio,
                user: {
                    connect: { id: Number(userId) },
                },
            },
        });
        res.json(updatedProfile);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(400).json({ message: 'Failed to update profile', error });
    }
});

//Se en användares alla posts
app.get('/users/:userId/posts', async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        const posts = await prisma.post.findMany({
            where: {
                authorId: Number(userId),
            },
            include: {
                user: true,
            },
        });
        res.status(200).json(posts);
    } catch (error) {
        console.error("error fetching posts", error)
        res.status(400).json({ message: 'Failed to fetch posts' })
    }
})

//Se alla posts
app.get('/posts', async (req: Request, res: Response) => {
    try {
        const posts = await prisma.post.findMany({
            include: {
                //Sätt på true för att se användare bakom posts
                user: false,
            },
        });
        res.status(200).json(posts)
    } catch (error) {
        console.error("Could not fetch all posts", error);
        res.status(500).json({ message: "Failed to fetch posts", error });
    }
})


//DELETE HANTERING

//Tar bort en specifik post
app.delete('/posts/:postId', async (req: Request, res: Response) => {
    const { postId } = req.params;
    try {
        await prisma.post.delete({
            where: { id: Number(postId) },
        });
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting post", error);
        res.status(404).json({ message: "Post not found", error })
    }
});

//Tar bort en användare
app.delete('/users/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        const deletedUser = await prisma.user.delete({
            where: { id: Number(userId) },
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting user', error);
        res.status(404).json({ message: "User not found", error });
    }
});


// ERROR HANTERING
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

//starta server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});