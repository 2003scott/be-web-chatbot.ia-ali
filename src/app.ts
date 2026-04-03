import express, { Request, Response } from 'express'
import morgan from 'morgan'
import cors from 'cors'

const app = express()

app.use(express.json())
app.use(morgan('dev'))
app.use(cors({
    credentials: true,
    origin: "*"
}))

app.get('/', (_req: Request, res: Response) => {
    res.json({ message: 'Chatbot ALI is running!' })
})


export default app