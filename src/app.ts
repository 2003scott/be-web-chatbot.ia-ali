import express, { Request, Response } from 'express'
import morgan from 'morgan'
import cors from 'cors'
import gemini from "./handlers/gemini/route";
import auth from "./handlers/auth/route";
import { env } from "./config";

const app = express()

app.use(express.json())
app.use(morgan('dev'))
app.use(cors({
    credentials: true,
    origin: "*",
}))

app.get('/', (_req: Request, res: Response) => {
    res.json({ message: 'Chatbot ALI for Gemini is running!' })
})

app.use("/api/auth", auth);
app.use("/api", gemini);


export default app