import express, { Request, Response } from 'express'
import morgan from 'morgan'
import cors from 'cors'
import gemini from "./handlers/gemini/route";
import auth from "./handlers/auth/route";

const app = express()

app.use(express.json())
app.use(morgan('dev'))
app.use(cors({
  origin: "*",
}))

app.get('/', (_req: Request, res: Response) => {
    res.json({ message: 'Chatbot ALI for Gemini is running!' })
})

app.use("/api/auth", auth);
app.use("/api", gemini);


export default app