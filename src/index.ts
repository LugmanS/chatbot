import express from "express"
import dotenv from "dotenv"
import api from "./api/index.js"
import webhook from "./webhook/index.js"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8080

app.use(express.json())

api(app)
webhook(app)

app.listen(PORT, () => console.log("Server listening at port:", PORT))
